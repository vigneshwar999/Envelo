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
      className={keyStatus === 'needs-restore' ? 'border-amber-300 dark:border-amber-800' : undefined}
    >
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" /> Envelope Key
        </CardTitle>
        <CardDescription>The key that opens invoices sealed for you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {keyStatus === 'checking' || !me ? (
          <Skeleton className="h-24 w-full" />
        ) : keyStatus === 'ready' ? (
          <>
            <div
              className="flex items-start gap-2.5 text-sm p-3 rounded-md border bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-900 dark:text-green-300"
              data-testid="text-key-status"
            >
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
              <p>This browser can open your envelopes.</p>
            </div>
            <p className="text-sm text-muted-foreground">
              The key lives only in this browser. Back it up once, and you can open your
              invoices on any device.
            </p>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => setBackupOpen(true)}
                data-testid="button-backup-key"
              >
                Back up my envelope key
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setRotateOpen(true)}
                data-testid="button-rotate-key"
              >
                Change to a fresh key
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setRestoreOpen(true)}
                data-testid="button-restore-key"
              >
                Restore from a backup instead
              </Button>
            </div>
          </>
        ) : (
          <>
            <div
              className="flex items-start gap-2.5 text-sm p-3 rounded-md border bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300"
              data-testid="text-key-status"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>This browser can't open your sealed invoices yet.</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Your envelope key stayed in the browser where you first signed in. On that
              device, choose{' '}
              <span className="font-medium text-foreground">Back up my envelope key</span> on
              the Dashboard, then bring the file here.
            </p>
            <Button
              className="w-full"
              onClick={() => setRestoreOpen(true)}
              data-testid="button-restore-key"
            >
              Restore my key
            </Button>
          </>
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
