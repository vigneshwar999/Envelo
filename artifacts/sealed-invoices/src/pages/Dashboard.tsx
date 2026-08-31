import { Link } from 'wouter';
import { useMe } from '@/context/UserContext';
import {
  useGetDashboardSummary,
  useListInvoices,
  Invoice,
  type InvoiceEventKind,
} from '@workspace/api-client-react';
import { Background } from '@/components/marketing/Background';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EnvelopeKeyCard } from '@/components/keys/EnvelopeKeyCard';
import { BackupReminderBanner } from '@/components/keys/BackupReminderBanner';
import { ReshareNeededBanner } from '@/components/keys/ReshareNeededBanner';
import { EditDisplayNameDialog } from '@/components/profile/EditDisplayNameDialog';
import { 
  PlusCircle, FileText, CheckCircle2, Clock, 
  ShieldCheck, Activity, KeyRound, Lock,
  Key, ShieldAlert, Unlock, BadgeCheck, Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function Dashboard() {
  const { me } = useMe();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: invoices, isLoading: isLoadingInvoices } = useListInvoices();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
      <Background />
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

      <div className="grid gap-6 md:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
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
          icon={<Activity className="h-4 w-4 text-primary" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 items-start animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl">
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
                <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-white/10 border-dashed">
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

        <div className="lg:col-span-1">
          <EnvelopeKeyCard />
        </div>
      </div>

      <Card className="shadow-xl bg-white/5 border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both" data-testid="card-recent-activity">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest invoice, payment, and access events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSummary ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : summary?.recentEvents.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No recent activity found.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {summary?.recentEvents.map((event, index) => (
                <div 
                  key={event.id} 
                  data-testid={`row-activity-${event.id}`}
                  className={cn(
                    "group flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-3.5 border-b border-border/40 last:border-0",
                    index === 0 ? "pt-0" : ""
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-muted-foreground group-hover:bg-white/10 transition-colors">
                      {getEventIcon(event.kind)}
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-foreground/90">
                      {event.detail}
                    </p>
                  </div>
                  <div className="text-[13px] text-muted-foreground sm:text-right font-mono tracking-tight shrink-0 pl-11 sm:pl-0 opacity-60">
                    {format(new Date(event.createdAt), 'MMM d, yyyy')} 
                    <span className="opacity-40 mx-1.5">•</span> 
                    {format(new Date(event.createdAt), 'h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string, value: string | null, icon: React.ReactNode }) {
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl transition-all hover:bg-white/[0.07]">
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
      <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] transition-all cursor-pointer gap-4 shadow-sm" data-testid={`row-invoice-${invoice.id}`}>
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

function getEventIcon(kind: InvoiceEventKind) {
  switch(kind) {
    case 'created': return <FileText className="h-4 w-4 text-primary" />;
    case 'anchored': return <ShieldCheck className="h-4 w-4 text-primary" />;
    case 'paid': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'grant_issued': return <Key className="h-4 w-4 text-amber-500" />;
    case 'grant_revoked': return <ShieldAlert className="h-4 w-4 text-destructive" />;
    case 'envelope_opened': return <Unlock className="h-4 w-4 text-violet-400" />;
    case 'verified': return <BadgeCheck className="h-4 w-4 text-teal-500" />;
    case 'key_reshared': return <Share2 className="h-4 w-4 text-orange-500" />;
    default: return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

export default Dashboard;
