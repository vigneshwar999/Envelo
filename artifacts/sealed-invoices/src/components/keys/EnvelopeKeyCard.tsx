import { useState } from 'react';
import { useMe } from '@/context/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BackupKeyDialog } from './BackupKeyDialog';
import { RestoreKeyDialog } from './RestoreKeyDialog';
import { RotateKeyDialog } from './RotateKeyDialog';
import { AlertTriangle, KeyRound, ShieldCheck } from 'lucide-react';

/**
 * Dashboard card for the envelope key: shows whether THIS browser can open
 * envelopes sealed for the account, and offers backup / restore in plain
 * envelope language.
 */
export function EnvelopeKeyCard() {
  const { me, keyStatus } = useMe();
  const [backupOpen, setBackupOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);

  return (
    <Card
      data-testid="card-envelope-key"
      className={keyStatus === 'needs-restore' 
        ? 'border-amber-500/30 bg-amber-500/5 backdrop-blur-md shadow-xl transition-all' 
        : 'bg-white/5 border-white/10 backdrop-blur-md shadow-xl transition-all'}
    >
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" /> Envelope Key
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground/80">
          Controls access to invoices sealed for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {keyStatus === 'checking' || !me ? (
          <Skeleton className="h-24 w-full" />
        ) : keyStatus === 'ready' ? (
          <div className="space-y-4">
            <div
              className="flex items-start gap-2.5 text-xs p-3 rounded-lg border border-primary/20 bg-primary/5 text-foreground/90"
              data-testid="text-key-status"
            >
              <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p className="leading-relaxed">
                Your envelope key is ready on this browser.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Save a protected backup so you can restore access if you change
              devices or clear this browser.
            </p>
            <div className="space-y-3 pt-1">
              <Button
                className="w-full font-medium"
                onClick={() => setBackupOpen(true)}
                data-testid="button-backup-key"
              >
                Back up key
              </Button>
              <div className="flex items-center justify-between border-t border-white/5 px-1 pt-3">
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setRestoreOpen(true)}
                  data-testid="button-restore-key"
                >
                  Restore backup
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setRotateOpen(true)}
                  data-testid="button-rotate-key"
                >
                  Use a new key
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="flex items-start gap-2.5 text-xs p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200"
              data-testid="text-key-status"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                An envelope key is needed on this browser.
              </p>
            </div>
            <p className="text-xs text-muted-foreground/80">
              Restore your key from a backup file to unlock your invoices on this device.
            </p>
            <div className="pt-1">
              <Button
                className="w-full font-medium"
                onClick={() => setRestoreOpen(true)}
                data-testid="button-restore-key"
              >
                Restore my key
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      {me && (
        <>
          <BackupKeyDialog open={backupOpen} onOpenChange={setBackupOpen} userId={me.id} />
          <RestoreKeyDialog open={restoreOpen} onOpenChange={setRestoreOpen} />
          <RotateKeyDialog open={rotateOpen} onOpenChange={setRotateOpen} />
        </>
      )}
    </Card>
  );
}