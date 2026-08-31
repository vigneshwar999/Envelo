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
import { exportKeyBackup } from '@/lib/crypto';
import { markKeyBackedUp } from '@/lib/backupNudge';
import { AlertTriangle, Download } from 'lucide-react';

interface BackupKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

/**
 * "Back up my envelope key": choose a passphrase, lock the key with it, and
 * download the result as a small file. The locking happens entirely in the
 * browser — the passphrase and the key never leave it.
 */
export function BackupKeyDialog({ open, onOpenChange, userId }: BackupKeyDialogProps) {
  const { toast } = useToast();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassphrase('');
      setConfirmPassphrase('');
      setError(null);
    }
    onOpenChange(next);
  };

  const handleDownload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (passphrase.length < 8) {
      setError('Please choose a passphrase of at least 8 characters.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError("The two passphrases don't match.");
      return;
    }
    setIsWorking(true);
    try {
      const backup = await exportKeyBackup(userId, passphrase);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `sealed-invoices-envelope-key-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      markKeyBackedUp(userId); // the one-time reminder stands down for good
      toast({
        title: 'Backup downloaded',
        description: 'Keep the file and your passphrase somewhere safe — you need both to restore.',
      });
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the backup file.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/90 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle>Back up your envelope key</DialogTitle>
          <DialogDescription>
            Your envelope key is what opens invoices sealed for you, and it lives only in
            this browser. This download is a locked copy of that key, so you can open your
            invoices on another device too.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleDownload} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-passphrase">Choose a passphrase</Label>
            <Input
              id="backup-passphrase"
              type="password"
              autoComplete="new-password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="At least 8 characters"
              data-testid="input-backup-passphrase"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="backup-passphrase-confirm">Type it again</Label>
            <Input
              id="backup-passphrase-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder="Same passphrase"
              data-testid="input-backup-passphrase-confirm"
            />
          </div>
          <div className="flex gap-2.5 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              There is no way to reset this passphrase. If you lose the file or forget the
              passphrase, that backup can't be unlocked — you would come back here and make
              a new one.
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive" data-testid="text-backup-error">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={isWorking}
            data-testid="button-download-backup"
          >
            <Download className="h-4 w-4 mr-2" />
            {isWorking ? 'Locking your key…' : 'Download backup file'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
