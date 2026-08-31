import { lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { ShieldCheck, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WalletMenu = lazy(() =>
  import("@/components/wallet/WalletMenu").then(({ WalletMenu: Menu }) => ({
    default: Menu,
  })),
);

const desktopNavLinkClass = (active: boolean) =>
  cn(
    "text-sm font-medium transition-colors relative px-3 py-2",
    active
      ? "text-foreground"
      : "text-muted-foreground hover:text-foreground"
  );

export function Shell({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const [location] = useLocation();
  const dashboardActive =
    location === "/dashboard" || location.startsWith("/invoices/");

  return (
    <div className="min-h-screen bg-transparent font-sans flex flex-col">
      <div 
        className="fixed top-0 inset-x-0 h-32 bg-gradient-to-b from-background via-background/80 to-transparent z-30 pointer-events-none" 
        style={{ backdropFilter: 'blur(8px)', maskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)' }} 
      />

      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/40 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2 font-medium tracking-tight"
            data-testid="link-home"
          >
            <ShieldCheck className="h-[1.125rem] w-[1.125rem] text-foreground transition-colors group-hover:text-primary" />
            <span className="text-lg font-semibold tracking-tight">Envelo</span>
            <span className="ml-1 hidden items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground lg:inline-flex">
              Arc Testnet
            </span>
          </Link>

          <nav
            className="hidden min-w-0 flex-1 items-center justify-center gap-4 xl:flex"
            aria-label="Main navigation"
          >
            <Link
              href="/explore"
              className={desktopNavLinkClass(location === "/explore")}
              data-testid="link-desktop-explore"
            >
              Explore
            </Link>
            {isSignedIn && (
              <>
                <Link
                  href="/dashboard"
                  className={desktopNavLinkClass(dashboardActive)}
                  data-testid="link-desktop-dashboard"
                >
                  Dashboard
                </Link>
                <Link
                  href="/wallet"
                  className={desktopNavLinkClass(location === "/wallet")}
                  data-testid="link-desktop-wallet"
                >
                  Wallet
                </Link>
                <Link
                  href="/private-usdc"
                  className={cn(
                    desktopNavLinkClass(location === "/private-usdc"),
                    "flex items-center gap-1.5",
                  )}
                  data-testid="link-desktop-shielded-usdc"
                >
                  Shielded USDC
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                    Soon
                  </span>
                </Link>
              </>
            )}
            <Link
              href="/how-it-works"
              className={desktopNavLinkClass(location === "/how-it-works")}
              data-testid="link-desktop-how-it-works"
            >
              How it Works
            </Link>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="xl:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-white/5"
                    data-testid="button-mobile-menu"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card/80 backdrop-blur-xl border-white/10">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/explore"
                      className="w-full cursor-pointer focus:bg-white/5"
                      data-testid="link-mobile-explore"
                    >
                      Explore
                    </Link>
                  </DropdownMenuItem>
                  {isSignedIn && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/dashboard"
                          className="w-full cursor-pointer focus:bg-white/5"
                          data-testid="link-mobile-dashboard"
                        >
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/wallet"
                          className="w-full cursor-pointer focus:bg-white/5"
                          data-testid="link-mobile-wallet"
                        >
                          Wallet
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/private-usdc"
                          className="w-full cursor-pointer flex justify-between items-center focus:bg-white/5"
                          data-testid="link-mobile-private-usdc"
                        >
                          Shielded USDC
                          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-1.5 py-[1px] text-[9px] uppercase font-bold text-muted-foreground">
                            Soon
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link
                      href="/how-it-works"
                      className="w-full cursor-pointer focus:bg-white/5"
                      data-testid="link-mobile-how-it-works"
                    >
                      How it Works
                    </Link>
                  </DropdownMenuItem>
                  {isLoaded && !isSignedIn && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/sign-in"
                          className="w-full cursor-pointer focus:bg-white/5"
                          data-testid="link-mobile-signin"
                        >
                          Sign in
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/sign-up"
                          className="w-full cursor-pointer font-medium focus:bg-white/5"
                          data-testid="link-mobile-signup"
                        >
                          Create account
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {!isLoaded ? null : isSignedIn ? (
              <Suspense
                fallback={
                  <div
                    className="h-8 w-8 animate-pulse rounded-full bg-white/10"
                    role="status"
                    aria-label="Loading wallet menu"
                  />
                }
              >
                <WalletMenu />
              </Suspense>
            ) : (
              <div className="hidden items-center gap-3 sm:flex">
                <Button asChild variant="ghost" size="sm" className="rounded-full text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground">
                  <Link href="/sign-in" data-testid="link-header-signin">
                    Sign in
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all">
                  <Link href="/sign-up" data-testid="link-header-signup">
                    Create account
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main
        className={cn(
          ["/", "/explore", "/how-it-works", "/terms", "/privacy"].includes(
            location,
          )
            ? "w-full"
            : "container mx-auto px-4 py-8 max-w-5xl relative z-10 flex-1 flex flex-col",
        )}
      >
        {children}
      </main>
    </div>
  );
}
