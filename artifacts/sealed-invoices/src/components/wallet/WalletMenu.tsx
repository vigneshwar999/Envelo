import { useState } from 'react';
import { Link } from 'wouter';
import { useClerk, useUser } from '@clerk/react';
import { useGetMyWallet, getGetMyWalletQueryKey } from '@workspace/api-client-react';
import { useMe } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { DepositWithdrawDialog } from './DepositWithdrawDialog';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function shorten(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

/**
 * The signed-in account menu: who you are, what your wallet holds, your
 * address, and the way into Deposit & withdraw - plus wallet settings and
 * log out. The balance is fetched only while the menu (or the dialog) is
 * open, so ordinary browsing never polls the chain.
 */
export function WalletMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayName = me?.displayName || user?.fullName || user?.username || 'You';
  const address = me?.walletAddress ?? null;

  const walletQuery = useGetMyWallet({
    query: { enabled: open || dialogOpen, queryKey: getGetMyWalletQueryKey() },
  });
  const wallet = walletQuery.data;

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the address stays selectable text.
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 gap-2 pl-1.5 pr-2"
            data-testid="button-wallet-menu"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-36 truncate text-sm font-medium sm:inline-block">
              {displayName}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 bg-card/90 backdrop-blur-xl border-white/10 shadow-2xl">
          <div className="flex items-baseline justify-between px-3 pt-2.5 pb-1.5">
            <span className="text-sm text-muted-foreground">Wallet</span>
            {walletQuery.isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="text-sm font-semibold" data-testid="text-menu-balance">
                {wallet?.balanceUsdc != null
                  ? `${wallet.balanceUsdc} test USDC`
                  : 'Balance unavailable'}
              </span>
            )}
          </div>
          {address ? (
            <div className="px-3 pb-2.5">
              <div className="flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                <span
                  className="flex-1 truncate font-mono text-xs"
                  data-testid="text-menu-address"
                >
                  {shorten(address)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={copyAddress}
                  aria-label="Copy wallet address"
                  data-testid="button-copy-menu-address"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button
                className="mt-2 w-full"
                onClick={() => {
                  setOpen(false);
                  setDialogOpen(true);
                }}
                data-testid="button-menu-deposit"
              >
                <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                Deposit
              </Button>
            </div>
          ) : (
            <p className="px-3 pb-2.5 text-xs text-muted-foreground">
              Your wallet is still being set up - it appears here right after
              sign-in finishes.
            </p>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href="/wallet"
              className="flex w-full cursor-pointer items-center"
              data-testid="link-menu-wallet-settings"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
              Wallet settings
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-muted-foreground"
            onSelect={() => void signOut({ redirectUrl: basePath || '/' })}
            data-testid="button-menu-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DepositWithdrawDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
