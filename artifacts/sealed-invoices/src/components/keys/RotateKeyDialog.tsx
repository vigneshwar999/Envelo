import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  discardStagedRotation,
  generateKeypairJwk,
  getStagedRotation,
  rewrapKeyForUser,
  setRotationRequestInFlight,
  stageKeyRotation,
  storeUserKeys,
} from '@/lib/crypto';
import { clearBackupNudge } from '@/lib/backupNudge';
import { useMe } from '@/context/UserContext';
import { listMyWrappedKeys, useRotateEncryptionKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

interface RotateKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The graceful key change, for someone who still HAS their key. All the
 * cryptography happens here in the browser: fetch every wrapped copy this
 * account holds, unwrap each with the OLD private key, re-wrap for the NEW
 * public key, and send everything to the server in one all-or-nothing
 * request. Nothing locks and nobody has to re-share - the polar opposite of
 * the destructive reset, which is why there is no RESET-typing ritual here.
 *
 * Order matters, and it is a two-phase commit: the new keypair is STAGED in
 * durable storage before the server is asked to swap (the active key stays
 * untouched), and promoted to the active slot only after the server said
 * yes. A definite refusal discards the staged key; an ambiguous outcome (the
 * connection died mid-request) keeps it, and the next page load resolves it
 * with the server's rotation fence - promoting the staged key if the swap
 * committed, discarding it only once the server proves the request can
 * never commit. Without the staging step, a browser crash in the moment
 * between the server committing and this code storing the new key would
 * lose the ONLY copy of the private key every envelope was just re-wrapped
 * for.
 */
export function RotateKeyDialog({ open, onOpenChange }: RotateKeyDialogProps) {
  const { me, keyStatus, notifyKeysChanged } = useMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rotateMutation = useRotateEncryptionKey();
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) setError(null);
    onOpenChange(next);
  };

  const handleRotate = async () => {
    if (!me?.publicKeyJwk || keyStatus !== 'ready') return;
    setError(null);
    setIsWorking(true);
    try {
      // A staged key from an earlier interrupted attempt means that attempt
      // may have gone through on the server. Never overwrite it with a new
      // keypair - reloading resolves it one way or the other first.
      if (getStagedRotation(me.id)) {
        throw new Error(
          "A previous key change in this browser hasn't finished saving. Reload the page - it finishes automatically - and then try again.",
        );
      }

      // 1. Everything wrapped for the current key, fresh from the server -
      //    the server refuses the swap unless we cover all of it.
      const held = await listMyWrappedKeys();

      // 2. A brand-new keypair. Nothing is stored yet - if anything below
      //    fails, this browser keeps working with the current key.
      const { publicKeyJwk: newPub, privateKeyJwk: newPriv } = await generateKeypairJwk();

      // 3. Re-seal every copy: old key opens it, new key closes it.
      const invoiceCopies: Array<{ invoiceId: string; wrappedKey: string }> = [];
      for (const copy of held.invoiceCopies) {
        try {
          invoiceCopies.push({
            invoiceId: copy.invoiceId,
            wrappedKey: await rewrapKeyForUser(copy.wrappedKey, me.id, newPub),
          });
        } catch {
          // An invoice copy that will not unwrap means the key in this
          // browser is not the one it was sealed for - rotating now would
          // lock that invoice. Stop before anything changes.
          throw new Error(
            'One of your envelope copies could not be opened with the key in this browser. Restore your correct key from a backup first, then try again.',
          );
        }
      }
      const grantCopies: Array<{ grantId: string; wrappedKey: string }> = [];
      const dropGrantIds: string[] = [];
      for (const grant of held.grantCopies) {
        try {
          grantCopies.push({
            grantId: grant.grantId,
            wrappedKey: await rewrapKeyForUser(grant.wrappedKey, me.id, newPub),
          });
        } catch {
          // A shared envelope that will not unwrap cannot be carried over.
          // Give it up instead of blocking the rotation - the person who
          // shared it can share it again.
          dropGrantIds.push(grant.grantId);
        }
      }

      // 4. Stage the new keypair durably BEFORE the server call. If this
      //    browser dies mid-request, the next load finds the staged key and
      //    resolves it against what the server actually did (promoting it,
      //    or discarding it only after the server fences this request out).
      stageKeyRotation(me.id, newPub, newPriv);

      // 5. One atomic request: the registered key and every copy move
      //    together, or nothing moves at all. The fence value ties this
      //    request to the account state it was prepared against; the flag
      //    tells the recovery flow not to fence our own request mid-air.
      setRotationRequestInFlight(true);
      try {
        await rotateMutation.mutateAsync({
          data: {
            fence: me.rotationFence,
            currentPublicKeyJwk: me.publicKeyJwk,
            newPublicKeyJwk: newPub,
            invoiceCopies,
            grantCopies,
            dropGrantIds,
          },
        });
      } catch (rotateErr: any) {
        const status = typeof rotateErr?.status === 'number' ? rotateErr.status : 0;
        if (status >= 400 && status < 500) {
          // The server definitely refused - nothing changed there, and this
          // browser keeps working with its current key.
          discardStagedRotation(me.id);
          throw rotateErr;
        }
        // Ambiguous: the connection died or the server errored mid-flight,
        // so the swap MAY have committed. Keep the staged key - reloading
        // reconciles it against the registered key, whichever way it went.
        throw new Error(
          "We couldn't confirm whether the key change went through. Nothing is lost either way - reload this page and it will pick up the correct key automatically.",
        );
      }

      // 6. The server accepted - promote the staged key to the active slot.
      storeUserKeys(me.id, newPub, newPriv);
      discardStagedRotation(me.id);
      // The new key has no backup yet - bring the backup reminder back even
      // if the user had backed up or dismissed it before.
      clearBackupNudge(me.id);
      notifyKeysChanged();
      await queryClient.invalidateQueries();
      toast({
        title: 'Envelope key changed',
        description:
          dropGrantIds.length > 0
            ? `Everything was carried over except ${dropGrantIds.length} shared envelope${
                dropGrantIds.length === 1 ? '' : 's'
              } that could not be read - ask for a new share if you still need ${
                dropGrantIds.length === 1 ? 'it' : 'them'
              }. Back up your new key now.`
            : 'Every invoice was carried over to your new key. Back up the new key now.',
      });
      handleOpenChange(false);
    } catch (err: any) {
      setError(
        err?.data?.error || err?.message || 'Could not change your key. Please try again.',
      );
    } finally {
      setRotationRequestInFlight(false);
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Change your envelope key
          </DialogTitle>
          <DialogDescription>
            Swap in a brand-new key and carry every envelope over to it. Nothing locks,
            and nobody has to re-share.
          </DialogDescription>
        </DialogHeader>
        <div
          className="text-sm space-y-2 p-3 rounded-md border bg-muted/40"
          data-testid="text-rotate-explainer"
        >
          <p className="font-medium">What happens - all inside this browser:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              Your current key opens each envelope copy, and each one is re-sealed for the
              new key. The server never sees any of them unlocked.
            </li>
            <li>
              You keep opening every invoice, and the other person on each one notices{' '}
              <span className="font-medium text-foreground">nothing</span>.
            </li>
            <li>
              It happens all at once or not at all - a failed attempt changes nothing.
            </li>
            <li>The new key starts without a backup, so back it up right after.</li>
          </ul>
          <p className="text-muted-foreground">
            Good moments for this: you retired a device that held the key, or a backup
            file may have ended up in the wrong hands.
          </p>
        </div>
        {error && (
          <div
            className="text-sm text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/30"
            data-testid="text-rotate-error"
          >
            {error}
          </div>
        )}
        <Button
          className="w-full"
          onClick={handleRotate}
          disabled={isWorking || !me || keyStatus !== 'ready'}
          data-testid="button-rotate-key-confirm"
        >
          {isWorking ? 'Re-sealing your envelopes…' : 'Create my new key and carry everything over'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
