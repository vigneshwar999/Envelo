import { Link, useLocation } from 'wouter';
import { useUser } from '@clerk/react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { WalletMenu } from '@/components/wallet/WalletMenu';

export function Shell({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-medium tracking-tight group">
              <ShieldCheck className="h-5 w-5 text-primary group-hover:text-primary/80 transition-colors" />
              <span className="text-lg font-semibold tracking-tight">Sealed Invoices</span>
              <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase font-bold text-muted-foreground border">
                Arc Testnet
              </span>
            </Link>
            <nav className="hidden md:flex gap-6 ml-4">
              {isSignedIn && (
                <>
                  <Link href="/dashboard" className={cn("text-sm font-medium transition-colors hover:text-primary", location === "/dashboard" ? "text-primary" : "text-muted-foreground")}>Dashboard</Link>
                  <Link href="/wallet" className={cn("text-sm font-medium transition-colors hover:text-primary", location === "/wallet" ? "text-primary" : "text-muted-foreground")}>Wallet</Link>
                </>
              )}
              <Link href="/how-it-works" className={cn("text-sm font-medium transition-colors hover:text-primary", location === "/how-it-works" ? "text-primary" : "text-muted-foreground")}>How it Works</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {!isLoaded ? null : isSignedIn ? (
              <WalletMenu />
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up">Create account</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {children}
      </main>
    </div>
  );
}
