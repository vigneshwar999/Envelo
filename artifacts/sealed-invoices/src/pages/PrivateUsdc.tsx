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
    document.title = 'Shielded USDC — Coming Soon | Envelo';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500 pt-6">
      <div className="space-y-6">
        <div
          className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary mb-2"
          data-testid="badge-private-usdc-coming-soon"
        >
          <Shield className="mr-2 h-3.5 w-3.5" />
          Coming Soon
        </div>
        <h1 className="text-4xl font-light tracking-tight text-foreground">Shielded USDC</h1>
        <p className="text-lg text-muted-foreground/80 leading-relaxed text-balance">
          Your invoice documents are already encrypted in the browser. Arc has
          described confidential transfers as a future capability; when official
          support becomes available, this page is intended to let you protect USDC
          before using it to settle an invoice.
        </p>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 flex items-start gap-4 mt-6 backdrop-blur-sm">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground/90 leading-relaxed">
            <strong className="text-foreground font-medium">Arc confidential transfers are not available yet.</strong> Current USDC balances and payments remain fully public onchain via the ArcScan explorer. The controls below are a visual preview of the planned shielding flow and do not move any funds.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm shadow-xl rounded-3xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Public Balance
            </CardTitle>
            <CardDescription className="text-muted-foreground/70">
              Visible to anyone on the ArcScan explorer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32 bg-white/10" />
            ) : (
              <p className="font-mono text-3xl font-light text-foreground" data-testid="text-public-balance">
                {wallet?.balanceUsdc != null ? `${wallet.balanceUsdc} USDC` : 'Unavailable'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm shadow-[0_0_30px_rgba(37,99,235,0.1)] rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[40px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-4 relative z-10">
            <CardTitle className="text-base font-medium flex items-center gap-2 text-primary">
              <EyeOff className="h-4 w-4" />
              Shielded Balance
            </CardTitle>
            <CardDescription className="text-primary/70">
               Planned protected balance. Not active on Arc today.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="font-mono text-3xl font-light text-primary/50" data-testid="text-private-balance">
                Not available
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8 pt-8 border-t border-white/5">
        <div className="space-y-3">
          <h2 className="text-2xl font-light tracking-tight">Shield Funds</h2>
          <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-2xl">
            The planned flow will let you move public test USDC into a protected
            balance after Arc releases official confidential-transfer support.
            Privacy guarantees will follow Arc's published implementation.
          </p>
        </div>
        
        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <span className="absolute left-4 top-3.5 text-muted-foreground/60 font-mono text-sm uppercase tracking-widest">USDC</span>
                <Input 
                  className="pl-20 h-12 rounded-xl font-mono bg-black/40 border-white/10 text-foreground/50 text-lg" 
                  placeholder="0.00 (Coming Soon)" 
                  disabled 
                  data-testid="input-shield-amount"
                />
              </div>
              <Button disabled className="h-12 sm:w-auto rounded-xl bg-primary/30 text-primary-foreground/50 border border-primary/20" data-testid="button-shield-submit">
                <Lock className="mr-2 h-4 w-4" />
                Shield USDC (Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 pt-6">
          <h2 className="text-2xl font-light tracking-tight">Pay from Shielded Balance</h2>
          <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-2xl">
            The planned invoice flow will let you select Shielded USDC as the
            payment source. The exact information disclosed to the receiver and
            public ledger will follow Arc's official privacy model.
          </p>
        </div>

        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 min-w-0 w-full">
                <div className="h-12 rounded-xl border border-white/5 bg-black/40 px-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground/60">Invoice payment</span>
                  <span className="font-mono text-sm text-muted-foreground/40 shrink-0 uppercase tracking-widest">Unavailable</span>
                </div>
              </div>
              <Button disabled className="h-12 w-full sm:w-auto rounded-xl bg-primary/30 text-primary-foreground/50 border border-primary/20" data-testid="button-pay-private">
                <ArrowRight className="mr-2 h-4 w-4" />
                Pay with Shielded USDC (Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
