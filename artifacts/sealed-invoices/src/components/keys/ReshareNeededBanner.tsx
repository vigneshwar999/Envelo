import { Link } from 'wouter';
import { useMe } from '@/context/UserContext';
import { useListInvoices, Invoice } from '@workspace/api-client-react';
import { KeyRound } from 'lucide-react';

/**
 * Heads-up that someone is stuck waiting on the viewer: a counterparty
 * reset their envelope key, so their copy of at least one shared invoice
 * stays locked until the viewer opens it and presses Re-share. Without
 * this banner they would only find out by spotting the amber badge on a
 * row - meanwhile the locked-out person just waits.
 *
 * The flags come straight from the invoice list the dashboard already
 * fetches (counterpartyNeedsRekey per invoice) - no extra request and no
 * new server data. The banner has no dismiss button on purpose: it
 * reflects live server state and disappears by itself the moment every
 * re-share is done, and hiding a real pending obligation would defeat it.
 */
export function ReshareNeededBanner() {
  const { me } = useMe();
  const { data: invoices } = useListInvoices();
  if (!me || !invoices) return null;

  // Only invoices we can actually fix: the counterparty lost their copy AND
  // ours still works. If both sides reset, the server would refuse the
  // re-share (caller_locked) - advertising it here would be a lie.
  const waiting = invoices.filter(
    (inv) => inv.counterpartyNeedsRekey && !inv.myCopyLocked,
  );
  if (waiting.length === 0) return null;

  // The party waiting on us is whichever side of the invoice we are not.
  const otherIdOf = (inv: Invoice) =>
    inv.freelancerId === me.id ? inv.clientId : inv.freelancerId;
  const nameOf = (inv: Invoice) =>
    inv.freelancerId === me.id ? inv.clientName : inv.freelancerName;
  // Count PEOPLE by user id, never by display name - names can collide.
  const peopleCount = new Set(waiting.map(otherIdOf)).size;
  const headline =
    peopleCount === 1
      ? `${nameOf(waiting[0])} is waiting on your re-share`
      : `${peopleCount} people are waiting on your re-share`;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20"
      data-testid="banner-reshare-needed"
    >
      <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium text-foreground">{headline}</p>
        <p className="text-sm text-muted-foreground">
          A key reset locked{' '}
          {waiting.length === 1
            ? 'their copy of the invoice below'
            : `their copies of the ${waiting.length} invoices below`}
          . Your copy still works - open each one and press Re-share to let them back in.
        </p>
        {/* Every pending re-share gets a link - an obligation the user
            cannot reach is an obligation they cannot clear. */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {waiting.map((inv) => (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-background px-2.5 py-1 text-xs font-medium hover:bg-amber-100 dark:border-amber-900 dark:hover:bg-amber-950/40 transition-colors"
              data-testid={`link-reshare-invoice-${inv.id}`}
            >
              <span className="font-mono">{inv.invoiceNumber}</span>
              <span className="text-muted-foreground">· {nameOf(inv)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
