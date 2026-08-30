import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { ShieldCheck, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WalletMenu } from "@/components/wallet/WalletMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Shell({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-medium tracking-tight group"
              data-testid="link-home"
            >
              <ShieldCheck className="h-5 w-5 text-primary group-hover:text-primary/80 transition-colors" />
              <span className="text-lg font-semibold tracking-tight">
                Envelo
              </span>
              <span className="hidden sm:inline-flex ml-2 items-center rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase font-bold text-muted-foreground border">
                Arc Testnet
              </span>
            </Link>
            <nav className="hidden md:flex gap-6 ml-4">
              <Link
                href="/explore"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  location === "/explore"
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
                data-testid="link-desktop-explore"
              >
                Explore
              </Link>
              {isSignedIn && (
                <>
                  <Link
                    href="/dashboard"
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      location === "/dashboard"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                    data-testid="link-desktop-dashboard"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/wallet"
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      location === "/wallet"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                    data-testid="link-desktop-wallet"
                  >
                    Wallet
                  </Link>
                  <Link
                    href="/private-usdc"
                    className={cn(
                      "text-sm font-medium transition-colors flex items-center gap-1.5 hover:text-primary",
                      location === "/private-usdc"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                    data-testid="link-desktop-shielded-usdc"
                  >
                    Shielded USDC
                    <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-[1px] text-[9px] uppercase font-bold text-secondary-foreground border">
                      Soon
                    </span>
                  </Link>
                </>
              )}
              <Link
                href="/how-it-works"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  location === "/how-it-works"
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
                data-testid="link-desktop-how-it-works"
              >
                How it Works
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-1"
                    data-testid="button-mobile-menu"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
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
              <WalletMenu />
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
          location === "/" || location === "/explore"
            ? "w-full"
            : "container mx-auto px-4 py-8 max-w-5xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}
