import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateKeypairJwk, storeUserKeys } from '@/lib/crypto';
import { clearBackupNudge } from '@/lib/backupNudge';
import { useMe } from '@/context/UserContext';
import { useResetEncryptionKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';

interface LostKeyResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The "I lost my key AND my backup" escape hatch. Creates a brand-new
 * envelope key and registers it with the server, which honestly deletes the
 * now-useless wrapped copies of old envelope keys. Old invoices stay locked
 * until the other person on each one presses Re-share. The flow spells all
 * of that out and requires typing RESET, because it cannot be undone.
 *
 * Order matters: the new key is generated first but stored only AFTER the
 * server accepted it - a failed request leaves this browser exactly as it
 * was.
 */
export function LostKeyResetDialog({ open, onOpenChange }: LostKeyResetDialogProps) {
  const { me, notifyKeysChanged } = useMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const resetMutation = useResetEncryptionKey();
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setConfirmText('');
      setError(null);
    }
    onOpenChange(next);
  };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!me || confirmText !== 'RESET') return;
    setError(null);
    setIsWorking(true);
    try {
      const { publicKeyJwk, privateKeyJwk } = await generateKeypairJwk();
      await resetMutation.mutateAsync({ data: { publicKeyJwk, confirm: 'RESET' } });
      storeUserKeys(me.id, publicKeyJwk, privateKeyJwk);
      // The new key has no backup yet - bring the backup reminder back even
      // if the user had backed up or dismissed it before.
      clearBackupNudge(me.id);
      notifyKeysChanged();
      await queryClient.invalidateQueries();
      toast({
        title: 'New envelope key created',
        description:
          'Invoices sealed for your old key stay locked until the other person re-shares them.',
      });
      handleOpenChange(false);
    } catch (err: any) {
      setError(err?.data?.error || err?.message || 'Could not reset your key. Please try again.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Reset your envelope key
          </DialogTitle>
          <DialogDescription>
            Only for when your key is gone for good - no other browser has it and there
            is no backup file.
          </DialogDescription>
        </DialogHeader>
        <div
          className="text-sm space-y-2 p-3 rounded-md border border-destructive/30 bg-destructive/5"
          data-testid="text-reset-warning"
        >
          <p className="font-medium text-destructive">What a reset really means:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              Invoices sealed for your current key will{' '}
              <span className="font-medium text-foreground">not</span> open with the new
              one - that is the whole point of the encryption.
            </li>
            <li>
              Each of those invoices comes back only when the other person on it presses{' '}
              <span className="font-medium text-foreground">Re-share</span>. Their copy
              still works.
            </li>
            <li>Payments, amounts, and onchain records are not affected.</li>
            <li>This cannot be undone.</li>
          </ul>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-confirm">Type RESET to continue</Label>
            <Input
              id="reset-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
              data-testid="input-reset-confirm"
            />
          </div>
          {error && (
            <div
              className="text-sm text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/30"
              data-testid="text-reset-error"
            >
              {error}
            </div>
          )}
          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={confirmText !== 'RESET' || isWorking || !me}
            data-testid="button-reset-key"
          >
            {isWorking ? 'Creating a new key…' : 'Reset and create a new key'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
