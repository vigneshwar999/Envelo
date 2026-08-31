import { useEffect, useState } from 'react';
import { useMe } from '@/context/UserContext';
import { getListInvoicesQueryKey, useListInvoices } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { BackupKeyDialog } from './BackupKeyDialog';
import {
  KEY_BACKED_UP_EVENT,
  dismissBackupNudge,
  hasBackedUpKey,
  isBackupNudgeDismissed,
} from '@/lib/backupNudge';
import { KeyRound, X } from 'lucide-react';

interface BackupReminderBannerProps {
  /**
   * Where the banner sits. On the dashboard it waits until the account has
   * at least one invoice (no stakes before that); on an invoice page the
   * viewer is already reading one, so that check is skipped.
   */
  placement: 'dashboard' | 'invoice';
}

/**
 * One-time reminder to back up the envelope key. Shows only while the
 * stakes are real and the nudge can help: this browser holds a working
 * key, invoices exist for the viewer, and no backup has ever been made
 * here. Backing up or dismissing it anywhere silences it everywhere -
 * it never nags.
 */
export function BackupReminderBanner({ placement }: BackupReminderBannerProps) {
  const { me, keyStatus } = useMe();
  const requireInvoices = placement === 'dashboard';
  // On the dashboard this is the same query the invoice list uses, so it
  // costs no extra request; on invoice pages it is skipped entirely.
  const { data: invoices } = useListInvoices({
    query: { enabled: requireInvoices, queryKey: getListInvoicesQueryKey() },
  });
  const [backupOpen, setBackupOpen] = useState(false);
  // Bumped to re-read the localStorage flags (after dismiss or a backup made
  // anywhere on the page, including via the Envelope Key card's own dialog).
  const [, setFlagsVersion] = useState(0);

  useEffect(() => {
    const recheck = () => setFlagsVersion((v) => v + 1);
    window.addEventListener(KEY_BACKED_UP_EVENT, recheck);
    return () => window.removeEventListener(KEY_BACKED_UP_EVENT, recheck);
  }, []);

  if (!me || keyStatus !== 'ready') return null; // no usable key here - the key card handles restore
  if (requireInvoices && (!invoices || invoices.length === 0)) return null; // nothing sealed for them yet
  if (hasBackedUpKey(me.id) || isBackupNudgeDismissed(me.id)) return null;

  const handleDismiss = () => {
    dismissBackupNudge(me.id);
    setFlagsVersion((v) => v + 1);
  };

  return (
    <>
      <div
        className="flex items-start gap-4 rounded-lg border border-primary/30 bg-primary/10 backdrop-blur-md p-5 shadow-xl"
        data-testid="banner-backup-reminder"
      >
        <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-foreground">
            One minute now saves your invoices later: back up your envelope key.
          </p>
          <p className="text-sm text-muted-foreground">
            The key that opens your invoices lives only in this browser. If this browser's
            data is ever cleared, envelopes sealed for you stay closed for good. One backup
            file opens them on any device.
          </p>
          <div className="pt-1">
            <Button size="sm" onClick={() => setBackupOpen(true)} data-testid="button-reminder-backup">
              Back up now
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss this reminder"
          data-testid="button-reminder-dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <BackupKeyDialog open={backupOpen} onOpenChange={setBackupOpen} userId={me.id} />
    </>
  );
}
