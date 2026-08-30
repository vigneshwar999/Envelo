import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSetPayoutAddress,
  getGetMeQueryKey,
  useGetMyWallet,
  getGetMyWalletQueryKey,
  useTransferMyBalance,
  useListMyTransfers,
  getListMyTransfersQueryKey,
} from '@workspace/api-client-react';
import { useMe } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Wallet,
  Link2,
  Unlink,
  PlugZap,
  ArrowRight,
  ExternalLink,
  ReceiptText,
} from 'lucide-react';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string }) => Promise<string[]>;
    };
  }
}

const ADDRESS_SHAPE = /^0x[0-9a-fA-F]{40}$/;

function shorten(address: string) {
  return `${address.slice(0, 8)}\u2026${address.slice(-6)}`;
}

export default function WalletSettings() {
  const { me, isLoading } = useMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const setPayout = useSetPayoutAddress();
  const walletQuery = useGetMyWallet();
  const transfer = useTransferMyBalance();
  const transfersQuery = useListMyTransfers();
  const [draft, setDraft] = useState('');
  const [connecting, setConnecting] = useState(false);

  const linked = me?.payoutAddress ?? null;
  const draftValid = ADDRESS_SHAPE.test(draft.trim());
  const hasExtension = typeof window !== 'undefined' && !!window.ethereum;

  const save = (address: string | null) => {
    setPayout.mutate(
      { data: { address } },
      {
        onSuccess: async () => {
          // canTransfer on the wallet endpoint depends on whether a payout
          // wallet is linked, so refresh BOTH queries or the "move balance"
          // button works from stale data.
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }),
            queryClient.invalidateQueries({
              queryKey: getGetMyWalletQueryKey(),
            }),
          ]);
          setDraft('');
          toast({
            title: address ? 'Wallet linked' : 'Back to the app-managed wallet',
            description: address
              ? 'From now on, payments to you land directly in your own wallet.'
              : 'Payments to you will collect in your app-managed wallet again.',
          });
        },
      },
    );
  };

  const connectExtension = async () => {
    if (!window.ethereum) return;
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      if (accounts?.[0]) setDraft(accounts[0]);
    } catch {
      toast({
        title: 'Could not read the wallet',
        description:
          'The connection was declined or the extension did not respond. You can paste the address instead.',
        variant: 'destructive',
      });
    } finally {
      setConnecting(false);
    }
  };

  // Errors from the generated client carry the server's plain-language
  // message on err.data.error; keep it visible inline, not in a toast.
  const saveError = setPayout.isError
    ? ((setPayout.error as { data?: { error?: string } } | null)?.data?.error ??
      'Something went wrong saving your wallet address.')
    : null;

  const wallet = walletQuery.data;

  const moveBalance = () => {
    transfer.mutate(undefined, {
      onSuccess: async () => {
        // Re-read the live balance AND the receipts list, so the new
        // transfer shows up in "Past transfers" without a reload.
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getGetMyWalletQueryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: getListMyTransfersQueryKey(),
          }),
        ]);
      },
    });
  };

  // Transfers move real (test) money - failures must stay readable inline,
  // not flash by in a toast.
  const transferError = transfer.isError
    ? ((transfer.error as { data?: { error?: string } } | null)?.data?.error ??
      'The transfer could not be completed. Check the balance and try again in a moment.')
    : null;

  // Money already sitting here before a wallet was linked (or before one is
  // linked) - the reason the move button exists at all.
  const idleBalance =
    wallet?.transferableUsdc != null && Number(wallet.transferableUsdc) > 0;

  if (isLoading || !me) {
    return (
      <div className="space-y-6 py-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          Payout wallet
        </h1>
        <p className="text-muted-foreground mt-1">
          Choose where the money lands when one of your invoices is paid.
        </p>
      </div>

      <Card data-testid="card-managed-wallet">
        <CardHeader>
          <CardTitle className="text-base">App-managed wallet</CardTitle>
          <CardDescription>
            Created for you automatically when you signed up. Zero setup, but
            the app holds its keys for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p
            className="font-mono text-sm break-all"
            data-testid="text-managed-address"
          >
            {me.walletAddress ?? 'Being created\u2026'}
          </p>

          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">Balance</p>
            {walletQuery.isLoading ? (
              <Skeleton className="h-6 w-36 mt-1" />
            ) : (
              <p className="font-mono text-lg" data-testid="text-managed-balance">
                {wallet?.balanceUsdc != null
                  ? `${wallet.balanceUsdc} test USDC`
                  : 'Unavailable right now'}
              </p>
            )}
            {!walletQuery.isLoading && wallet?.balanceUsdc == null && (
              <p className="text-xs text-muted-foreground">
                The Arc test network cannot be reached at the moment, so the
                balance cannot be read. Try again shortly.
              </p>
            )}
          </div>

          {linked && wallet && (
            <div className="space-y-2">
              {wallet.canTransfer ? (
                <>
                  <Button
                    onClick={moveBalance}
                    disabled={transfer.isPending}
                    data-testid="button-transfer-balance"
                  >
                    <ArrowRight className="h-4 w-4 mr-1.5" />
                    {transfer.isPending
                      ? 'Moving\u2026'
                      : `Move ${wallet.transferableUsdc} USDC to your wallet`}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Money that arrived before you linked your wallet stays here
                    until you move it. About {wallet.reserveUsdc} USDC stays
                    behind to cover the network fee.
                  </p>
                </>
              ) : (
                wallet.balanceUsdc != null &&
                !transfer.isSuccess && (
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="text-nothing-to-move"
                  >
                    Nothing to move right now &mdash; new payments already land
                    in your own linked wallet.
                  </p>
                )
              )}

              {transfer.isSuccess && transfer.data && (
                <div
                  className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm space-y-1"
                  data-testid="block-transfer-success"
                >
                  <p>
                    Moved {transfer.data.amountUsdc} test USDC to your linked
                    wallet ({shorten(transfer.data.toAddress)}).
                  </p>
                  <a
                    href={transfer.data.explorerTxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-mono text-xs inline-flex items-center gap-1"
                    data-testid="link-transfer-tx"
                  >
                    See the transaction on ArcScan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {transferError && (
                <p
                  className="text-sm text-destructive"
                  data-testid="text-transfer-error"
                >
                  {transferError}
                </p>
              )}
            </div>
          )}

          {!linked && (
            <p className="text-sm text-muted-foreground">
              This is where your payments currently arrive.
              {idleBalance &&
                ' Link your own wallet below and a button appears here to move this balance there.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-own-wallet">
        <CardHeader>
          <CardTitle className="text-base">Your own wallet</CardTitle>
          <CardDescription>
            Optional. Link a wallet only you control, and every future payment
            to you skips the app and lands straight there. Sign-in stays
            exactly the same.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {linked ? (
            <>
              <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Link2 className="h-4 w-4 text-primary shrink-0" />
                  <span
                    className="font-mono text-sm truncate"
                    data-testid="text-linked-address"
                    title={linked}
                  >
                    {shorten(linked)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => save(null)}
                  disabled={setPayout.isPending}
                  data-testid="button-unlink-payout"
                >
                  <Unlink className="h-4 w-4 mr-1.5" />
                  Unlink
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Payments to you now go straight to this address. To use a
                different wallet, unlink first.
              </p>
            </>
          ) : (
            <>
              {hasExtension && (
                <Button
                  variant="outline"
                  onClick={connectExtension}
                  disabled={connecting}
                  data-testid="button-connect-extension"
                >
                  <PlugZap className="h-4 w-4 mr-1.5" />
                  {connecting
                    ? 'Waiting for your wallet\u2026'
                    : 'Connect wallet extension'}
                </Button>
              )}
              <div className="space-y-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="0x\u2026 paste your wallet address"
                  className="font-mono"
                  data-testid="input-payout-address"
                />
                {draft.trim() !== '' && !draftValid && (
                  <p className="text-sm text-muted-foreground">
                    A wallet address starts with 0x followed by 40 letters and
                    numbers.
                  </p>
                )}
                <Button
                  onClick={() => save(draft.trim())}
                  disabled={!draftValid || setPayout.isPending}
                  data-testid="button-save-payout"
                >
                  {setPayout.isPending ? 'Linking\u2026' : 'Link this wallet'}
                </Button>
              </div>
            </>
          )}
          {saveError && (
            <p className="text-sm text-destructive" data-testid="text-payout-error">
              {saveError}
            </p>
          )}
          <p className="text-xs text-muted-foreground border-t pt-3">
            Arc is a test network and payments are in test USDC, not real
            money. Double-check the address before linking &mdash; money sent
            to a wrong address cannot be recovered. After an invoice is paid,
            the explorer link on its timeline shows the money arriving.
          </p>
        </CardContent>
      </Card>

      {transfersQuery.data && transfersQuery.data.length > 0 && (
        <Card data-testid="card-transfer-history">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-primary" />
              Past transfers
            </CardTitle>
            <CardDescription>
              Your receipts. Every time you moved money out of the app is
              listed here, each with a link to the real transaction on
              ArcScan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {transfersQuery.data.map((receipt) => (
                <li
                  key={receipt.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border bg-muted/40 px-3 py-2"
                  data-testid={`row-transfer-${receipt.id}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">
                        {receipt.amountUsdc} test USDC
                      </span>{' '}
                      to{' '}
                      <span className="font-mono" title={receipt.toAddress}>
                        {shorten(receipt.toAddress)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(receipt.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <a
                    href={receipt.explorerTxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs inline-flex items-center gap-1 shrink-0"
                    data-testid={`link-transfer-receipt-${receipt.id}`}
                  >
                    See it on ArcScan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
