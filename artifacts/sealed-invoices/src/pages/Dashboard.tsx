import { Link } from 'wouter';
import { useMe } from '@/context/UserContext';
import { useGetDashboardSummary, useListInvoices, useGetChainStatus, Invoice } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EnvelopeKeyCard } from '@/components/keys/EnvelopeKeyCard';
import { BackupReminderBanner } from '@/components/keys/BackupReminderBanner';
import { ReshareNeededBanner } from '@/components/keys/ReshareNeededBanner';
import { EditDisplayNameDialog } from '@/components/profile/EditDisplayNameDialog';
import { PlusCircle, FileText, CheckCircle2, Clock, ShieldCheck, Activity, Wallet, Fuel, AlertTriangle, KeyRound, Lock } from 'lucide-react';
import { format } from 'date-fns';

export function Dashboard() {
  const { me, keyStatus } = useMe();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: invoices, isLoading: isLoadingInvoices } = useListInvoices();
  const { data: chainStatus, isLoading: isLoadingChain } = useGetChainStatus();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Welcome back{me ? `, ${me.displayName}` : ''}</span>
            {me && <EditDisplayNameDialog />}
          </h1>
          <p className="text-muted-foreground mt-1">
            Invoices you sent, invoices you received, and envelopes shared with you.
          </p>
        </div>

        <Button asChild>
          <Link href="/invoices/new" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      {/* Someone else being locked out ranks above our own backup nudge. */}
      <ReshareNeededBanner />
      <BackupReminderBanner placement="dashboard" />

      <div className="grid gap-6 md:grid-cols-4">
        <SummaryCard 
          title="Total Outstanding" 
          value={summary ? `$${summary.totalOutstandingUsdc}` : null} 
          icon={<Clock className="h-4 w-4 text-amber-500" />}
        />
        <SummaryCard 
          title="Total Paid" 
          value={summary ? `$${summary.totalPaidUsdc}` : null} 
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
        />
        <SummaryCard 
          title="Invoices Anchored" 
          value={summary ? summary.anchoredCount.toString() : null} 
          icon={<ShieldCheck className="h-4 w-4 text-primary" />}
        />
        <SummaryCard 
          title="Active Grants" 
          value={summary ? summary.activeGrants.toString() : null} 
          icon={<Activity className="h-4 w-4 text-blue-500" />}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Your latest billing documents.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInvoices ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : invoices?.length === 0 ? (
                <div className="text-center py-12 bg-secondary/30 rounded-lg border border-dashed">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No invoices yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Seal your first invoice, or ask someone to send you one.
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/invoices/new">Create Invoice</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices?.slice(0, 5).map(invoice => (
                    <InvoiceRow key={invoice.id} invoice={invoice} currentUserId={me?.id ?? ''} />
                  ))}
                  {invoices && invoices.length > 5 && (
                    <div className="pt-4 text-center">
                      <Button variant="ghost" size="sm" className="text-muted-foreground">View all invoices</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* When this browser can't open the user's envelopes, the fix comes first. */}
          {keyStatus === 'needs-restore' && <EnvelopeKeyCard />}

          <Card>
            <CardHeader>
              <CardTitle>Network Status</CardTitle>
              <CardDescription>Arc Testnet Connection</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingChain ? (
                <Skeleton className="h-24 w-full" />
              ) : chainStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <Badge variant={chainStatus.readyForPayments ? "success" : "warning"}>
                      {chainStatus.readyForPayments ? "Ready" : "Not Ready"}
                    </Badge>
                  </div>
                  {chainStatus.myWalletAddress && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                        <Wallet className="h-3.5 w-3.5" /> Your wallet
                      </span>
                      <span className="font-mono text-xs truncate" title={chainStatus.myWalletAddress}>
                        {chainStatus.myWalletAddress.slice(0, 6)}…{chainStatus.myWalletAddress.slice(-4)}
                        {chainStatus.myBalanceUsdc != null && (
                          <span className="text-muted-foreground ml-2">{Number(chainStatus.myBalanceUsdc).toFixed(2)} USDC</span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground p-3 bg-secondary/50 rounded-md border text-balance leading-relaxed">
                    {chainStatus.statusMessage}
                  </div>
                  {!chainStatus.readyForPayments && (
                    <Button asChild variant="outline" className="w-full text-xs" size="sm">
                      <a href={chainStatus.faucetUrl} target="_blank" rel="noopener noreferrer">
                        Visit Arc Faucet
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-sm text-destructive">Failed to load network status</div>
              )}
            </CardContent>
          </Card>

          {keyStatus !== 'needs-restore' && <EnvelopeKeyCard />}

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : summary?.recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
              ) : (
                <div className="space-y-4">
                  {summary?.recentEvents.map(event => (
                    <div key={event.id} className="flex gap-3 text-sm">
                      <div className="mt-0.5"><Activity className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      <div>
                        <p className="text-foreground leading-tight">{event.detail}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(event.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string, value: string | null, icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        <div className="flex items-center">
          {value === null ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <div className="text-2xl font-bold">{value}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceRow({ invoice, currentUserId }: { invoice: Invoice, currentUserId: string }) {
  const isCreator = invoice.freelancerId === currentUserId;
  const isClient = invoice.clientId === currentUserId;

  let roleLabel = "Shared";
  let counterparty = '';
  if (isCreator) {
    roleLabel = "Sent";
    counterparty = `To ${invoice.clientName}`;
  } else if (isClient) {
    roleLabel = "Received";
    counterparty = `From ${invoice.freelancerName}`;
  } else {
    counterparty = `${invoice.freelancerName} to ${invoice.clientName}`;
  }

  return (
    <Link href={`/invoices/${invoice.id}`}>
      <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-secondary/20 transition-colors cursor-pointer gap-4" data-testid={`row-invoice-${invoice.id}`}>
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 text-primary rounded-md hidden sm:block">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{invoice.invoiceNumber}</span>
              <Badge variant="outline" className="text-[10px] uppercase">{roleLabel}</Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span>{counterparty}</span>
              <span>•</span>
              {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
              <span>•</span>
              <span className="font-mono">${invoice.amountUsdc} USDC</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Lost-key states: my own copy is gone (locked) vs. the other
              party's is (they need me to re-share). Both come straight from
              the server's wrapped-key bookkeeping. */}
          {invoice.myCopyLocked && (
            <Badge variant="outline" className="text-muted-foreground" data-testid={`badge-locked-${invoice.id}`}>
              <Lock className="w-3 h-3 mr-1" />
              Locked
            </Badge>
          )}
          {invoice.counterpartyNeedsRekey && (
            <Badge variant="warning" data-testid={`badge-reshare-${invoice.id}`}>
              <KeyRound className="w-3 h-3 mr-1" />
              Re-share needed
            </Badge>
          )}
          {invoice.anchorStatus === 'anchored' && (
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20" data-testid={`badge-anchored-${invoice.id}`}>
              <ShieldCheck className="w-3 h-3 mr-1" />
              Anchored
            </Badge>
          )}
          <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'} data-testid={`badge-status-${invoice.id}`}>
            {invoice.status === 'paid' ? 'Paid' : 'Awaiting Payment'}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

export default Dashboard;
