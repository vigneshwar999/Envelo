import { lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { ArrowRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WalletMenu = lazy(() =>
  import("@/components/wallet/WalletMenu").then((mod) => ({
    default: mod.WalletMenu,
  })),
);

const desktopNavLinkClass = (active: boolean) =>
  cn(
    "text-xs font-medium transition-colors relative px-2.5 py-2 whitespace-nowrap",
    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  );

export function Shell({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const [location] = useLocation();
  const dashboardActive =
    location === "/dashboard" || location.startsWith("/invoices/");
  const isMarketingRoute = [
    "/",
    "/explore",
    "/how-it-works",
    "/terms",
    "/privacy",
  ].includes(location);

  return (
    <div className="min-h-screen bg-transparent font-sans flex flex-col">
      {/* Nebula floating pill navbar */}
      <header className="fixed top-0 inset-x-0 z-40 flex justify-center px-3 pt-3 sm:pt-4 pointer-events-none">
        <div className="pointer-events-auto flex h-[52px] w-full max-w-fit items-center gap-1 rounded-full border border-white/10 bg-[#0a0a0a]/90 pl-5 pr-2 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <Link
            href="/"
            className="group mr-2 flex shrink-0 items-center gap-2"
            data-testid="link-home"
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="Envelo logo"
              className="h-5 w-5 transition-transform group-hover:scale-110"
            />
            <span className="text-[15px] font-bold tracking-tight">
              Envelo
            </span>
            <span className="ml-0.5 hidden items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground lg:inline-flex">
              Arc Testnet
            </span>
          </Link>

          <nav
            className="hidden min-w-0 items-center xl:flex"
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

          <div className="ml-1 flex shrink-0 items-center gap-1.5">
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
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-[#0c0c0c]/95 backdrop-blur-xl border-white/10 rounded-2xl"
                >
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
              <div className="hidden items-center gap-1.5 sm:flex">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
                >
                  <Link href="/sign-in" data-testid="link-header-signin">
                    Sign in
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="h-9 rounded-full border border-white/15 bg-white/[0.06] px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground shadow-none hover:bg-white/10 transition-all"
                >
                  <Link
                    href="/sign-up"
                    className="flex items-center gap-2"
                    data-testid="link-header-signup"
                  >
                    Create account
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main
        className={cn(
          isMarketingRoute
            ? "w-full"
            : "container mx-auto px-4 pt-28 pb-10 max-w-7xl relative z-10 flex-1 flex flex-col",
        )}
      >
        {children}
      </main>
    </div>
  );
}
