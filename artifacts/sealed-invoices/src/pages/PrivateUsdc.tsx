import { useEffect } from 'react';
import { useGetMyWallet } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Lock, Eye, EyeOff, Info, ArrowRight } from 'lucide-react';

export default function PrivateUsdc() {
  const { data: wallet, isLoading } = useGetMyWallet();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Private USDC — Coming Soon | Sealed Invoices';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <div
          className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-2"
          data-testid="badge-private-usdc-coming-soon"
        >
          <Shield className="mr-2 h-4 w-4" />
          Coming Soon
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Private USDC</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Your invoice documents are already encrypted in the browser. Arc has
          described confidential transfers as a future capability; when official
          support becomes available, this page is intended to let you protect USDC
          before using it to settle an invoice.
        </p>
        <div className="rounded-md border bg-muted/30 px-4 py-3 flex items-start gap-3 mt-4">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground font-medium">Arc confidential transfers are not available yet.</strong> Current USDC balances and payments remain fully public onchain via the ArcScan explorer. The controls below are a visual preview of the planned shielding flow and do not move any funds.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Public Balance
            </CardTitle>
            <CardDescription>
              Visible to anyone on the ArcScan explorer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="font-mono text-2xl text-foreground" data-testid="text-public-balance">
                {wallet?.balanceUsdc != null ? `${wallet.balanceUsdc} USDC` : 'Unavailable'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2 text-primary">
              <EyeOff className="h-4 w-4" />
              Private Balance
            </CardTitle>
            <CardDescription className="text-primary/80">
               Planned protected balance. Not active on Arc today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="font-mono text-2xl text-primary/60" data-testid="text-private-balance">
                Not available
              </p>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                Coming Soon
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 pt-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Shield Funds</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The planned flow will let you move public test USDC into a protected
            balance after Arc releases official confidential-transfer support.
            Privacy guarantees will follow Arc's published implementation.
          </p>
        </div>
        
        <Card className="opacity-90">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-mono text-sm">USDC</span>
                <Input 
                  className="pl-14 font-mono bg-muted/20" 
                  placeholder="0.00 (Coming Soon)" 
                  disabled 
                  data-testid="input-shield-amount"
                />
              </div>
              <Button disabled className="sm:w-40 bg-primary/80" data-testid="button-shield-submit">
                <Lock className="mr-2 h-4 w-4" />
                Shield USDC (Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2 pt-4">
          <h2 className="text-xl font-semibold tracking-tight">Pay from Private Balance</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The planned invoice flow will let you select Private USDC as the
            payment source. The exact information disclosed to the receiver and
            public ledger will follow Arc's official privacy model.
          </p>
        </div>

        <Card className="opacity-90">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 min-w-0 w-full">
                <div className="rounded-md border bg-muted/20 px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground truncate">Invoice payment</span>
                  <span className="font-mono text-sm text-muted-foreground shrink-0">Unavailable</span>
                </div>
              </div>
              <Button disabled className="w-full sm:w-auto bg-primary/80" data-testid="button-pay-private">
                <ArrowRight className="mr-2 h-4 w-4" />
                Pay with Private USDC (Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
