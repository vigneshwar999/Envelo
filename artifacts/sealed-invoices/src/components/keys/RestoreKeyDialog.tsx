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
import { importKeyBackup } from '@/lib/crypto';
import { markKeyBackedUp } from '@/lib/backupNudge';
import { useMe } from '@/context/UserContext';
import { LostKeyResetDialog } from '@/components/keys/LostKeyResetDialog';
import { KeyRound } from 'lucide-react';

interface RestoreKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Restore my key": pick the backup file, enter its passphrase, and this
 * browser gets the envelope key — sealed invoices open here from then on.
 * Errors render inline (not as toasts) so they can't be missed.
 */
export function RestoreKeyDialog({ open, onOpenChange }: RestoreKeyDialogProps) {
  const { me, notifyKeysChanged } = useMe();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFile(null);
      setPassphrase('');
      setError(null);
    }
    onOpenChange(next);
  };

  const handleRestore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!me) return;
    setError(null);
    if (!file) {
      setError('Pick your backup file first.');
      return;
    }
    if (!passphrase) {
      setError('Enter the passphrase you chose when you made the backup.');
      return;
    }
    setIsWorking(true);
    try {
      const text = await file.text();
      await importKeyBackup(text, passphrase, {
        userId: me.id,
        registeredPublicKeyJwk: me.publicKeyJwk ?? null,
      });
      notifyKeysChanged();
      // A successful restore proves a usable backup file exists - no need to
      // remind this user to make one.
      markKeyBackedUp(me.id);
      toast({
        title: 'Envelope key restored',
        description: 'Invoices sealed for you now open in this browser.',
      });
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore from this file.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restore your envelope key</DialogTitle>
          <DialogDescription>
            Use the backup file you downloaded on your other device (Dashboard →
            "Back up my envelope key" there). Unlocking happens in this browser — the
            file and passphrase are never sent anywhere.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRestore} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restore-file">Backup file</Label>
            <Input
              id="restore-file"
              type="file"
              accept="application/json,.json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              data-testid="input-restore-file"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="restore-passphrase">Backup passphrase</Label>
            <Input
              id="restore-passphrase"
              type="password"
              autoComplete="current-password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="The passphrase you chose for this backup"
              data-testid="input-restore-passphrase"
            />
          </div>
          {error && (
            <div
              className="text-sm text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/30"
              data-testid="text-restore-error"
            >
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={isWorking || !me}
            data-testid="button-restore-submit"
          >
            <KeyRound className="h-4 w-4 mr-2" />
            {isWorking ? 'Unlocking…' : 'Restore my key'}
          </Button>
          <div className="pt-1 text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive transition-colors"
              onClick={() => {
                handleOpenChange(false);
                setResetOpen(true);
              }}
              data-testid="button-lost-backup"
            >
              No backup file anywhere? Reset your key
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {/* Lives outside the Dialog above so it survives that dialog closing. */}
    <LostKeyResetDialog open={resetOpen} onOpenChange={setResetOpen} />
    </>
  );
}
