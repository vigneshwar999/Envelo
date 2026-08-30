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
    "rounded-full px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

export function Shell({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const [location] = useLocation();
  const dashboardActive =
    location === "/dashboard" || location.startsWith("/invoices/");

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="sticky top-0 z-40 w-full border-b bg-background/90 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2 font-medium tracking-tight"
            data-testid="link-home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5">
              <ShieldCheck className="h-[1.125rem] w-[1.125rem] text-primary transition-colors group-hover:text-seal" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Envelo</span>
            <span className="ml-1 hidden items-center rounded-full border bg-muted/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground lg:inline-flex">
              Arc Testnet
            </span>
          </Link>

          <nav
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex"
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
                  <span className="inline-flex items-center rounded-full border border-current/10 bg-secondary px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wide text-secondary-foreground">
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
                    className="rounded-full"
                    data-testid="button-mobile-menu"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/explore"
                      className="w-full cursor-pointer"
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
                          className="w-full cursor-pointer"
                          data-testid="link-mobile-dashboard"
                        >
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/wallet"
                          className="w-full cursor-pointer"
                          data-testid="link-mobile-wallet"
                        >
                          Wallet
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/private-usdc"
                          className="w-full cursor-pointer flex justify-between items-center"
                          data-testid="link-mobile-private-usdc"
                        >
                          Shielded USDC
                          <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-[1px] text-[9px] uppercase font-bold text-secondary-foreground border">
                            Soon
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link
                      href="/how-it-works"
                      className="w-full cursor-pointer"
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
                          className="w-full cursor-pointer"
                          data-testid="link-mobile-signin"
                        >
                          Sign in
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/sign-up"
                          className="w-full cursor-pointer font-medium"
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
                    className="h-9 w-9 animate-pulse rounded-md bg-muted"
                    role="status"
                    aria-label="Loading wallet menu"
                  />
                }
              >
                <WalletMenu />
              </Suspense>
            ) : (
              <div className="hidden items-center gap-3 sm:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in" data-testid="link-header-signin">
                    Sign in
                  </Link>
                </Button>
                <Button asChild size="sm">
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
            : "container mx-auto px-4 py-8 max-w-5xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}
