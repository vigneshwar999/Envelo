import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  useGetChainStatus,
  useGetMyWallet,
  useWithdrawMyBalance,
  getGetChainStatusQueryKey,
  getGetMyWalletQueryKey,
  getListMyTransfersQueryKey,
  type BalanceTransferResult,
} from '@workspace/api-client-react';
import { useMe } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react';

const ADDRESS_SHAPE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Parse a decimal string into exact 18-decimal integer units (test USDC's
 * precision on Arc). Returns null for anything that is not a plain
 * digits[.digits] number. No floats anywhere, so amounts with many decimal
 * places compare exactly - the same arithmetic the server does.
 */
const toUnits = (s: string): bigint | null => {
  const m = /^(\d{1,10})(?:\.(\d{1,18}))?$/.exec(s.trim());
  if (!m) return null;
  return BigInt(m[1]) * 10n ** 18n + BigInt((m[2] ?? '').padEnd(18, '0'));
};
const MIN_WITHDRAW_UNITS = 10n ** 16n; // 0.01 in 18-decimal units

/**
 * Deposit & withdraw for the app-managed wallet. Deposit shows the address
 * (text + QR) money can be sent to; withdraw sends a chosen amount to any
 * Arc address. Amount limits come from the server's wallet endpoint - the
 * client never re-derives the gas-reserve rule.
 */
export function DepositWithdrawDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { me } = useMe();
  const queryClient = useQueryClient();
  const walletQuery = useGetMyWallet({
    query: { enabled: open, queryKey: getGetMyWalletQueryKey() },
  });
  const chainQuery = useGetChainStatus({
    query: { enabled: open, queryKey: getGetChainStatusQueryKey() },
  });
  const withdraw = useWithdrawMyBalance();

  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<BalanceTransferResult | null>(null);

  const wallet = walletQuery.data;
  const address = wallet?.address ?? me?.walletAddress ?? null;
  const faucetUrl = chainQuery.data?.faucetUrl ?? null;

  // Every open starts fresh: deposit tab, linked wallet (if any) as the
  // suggested destination, no leftover receipt or error.
  useEffect(() => {
    if (open) {
      setTab('deposit');
      setToAddress(me?.payoutAddress ?? '');
      setAmount('');
      setReceipt(null);
      withdraw.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be denied; the full address stays visible to select.
    }
  };

  const addrOk = ADDRESS_SHAPE.test(toAddress.trim());
  const amountUnits = toUnits(amount);
  const amountOk = amountUnits !== null && amountUnits >= MIN_WITHDRAW_UNITS;
  // Display-level hint only - the server re-checks against a fresh balance.
  const maxUnits =
    wallet?.transferableUsdc != null ? toUnits(wallet.transferableUsdc) : null;
  const overMax = amountUnits !== null && maxUnits !== null && amountUnits > maxUnits;

  const submit = () => {
    setReceipt(null);
    withdraw.mutate(
      { data: { toAddress: toAddress.trim(), amountUsdc: amount.trim() } },
      {
        onSuccess: async (result) => {
          setReceipt(result);
          setAmount('');
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: getGetMyWalletQueryKey() }),
            queryClient.invalidateQueries({ queryKey: getListMyTransfersQueryKey() }),
          ]);
        },
      },
    );
  };

  // Must-see failure: keep it inline next to the button, never a toast.
  const withdrawError = withdraw.isError
    ? ((withdraw.error as { data?: { error?: string } } | null)?.data?.error ??
      'Something went wrong - nothing was sent. Try again in a moment.')
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/90 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle>Deposit &amp; withdraw</DialogTitle>
          <DialogDescription>
            Manage your app-managed wallet balance on Arc Testnet
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'deposit' | 'withdraw')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit" data-testid="tab-deposit">
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" data-testid="tab-withdraw">
              Withdraw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="mt-4 space-y-4">
            <div>
              <div className="mb-1.5 text-sm font-medium">Deposit wallet address</div>
              {address ? (
                <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-2">
                  <span
                    className="flex-1 break-all font-mono text-xs"
                    data-testid="text-deposit-address"
                  >
                    {address}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={copyAddress}
                    aria-label="Copy wallet address"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ) : (
                <Skeleton className="h-9 w-full" />
              )}
            </div>
            {address && (
              <div className="flex justify-center">
                <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-xl" data-testid="qr-deposit">
                  <QRCodeSVG value={address} size={168} />
                </div>
              </div>
            )}
            <Button
              variant="secondary"
              className="w-full"
              onClick={copyAddress}
              disabled={!address}
              data-testid="button-copy-address"
            >
              {copied ? (
                <Check className="mr-1.5 h-4 w-4" />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" />
              )}
              Copy address
            </Button>
            <p className="text-xs text-muted-foreground">
              Send only test USDC on Arc Testnet to this address.
              {faucetUrl && (
                <>
                  {' '}
                  Free test funds:{' '}
                  <a
                    href={faucetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground"
                    data-testid="link-faucet"
                  >
                    Circle faucet
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </p>
            <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">Balance</span>
              <span className="text-sm font-semibold" data-testid="text-dialog-balance">
                {wallet?.balanceUsdc != null
                  ? `${wallet.balanceUsdc} test USDC`
                  : 'Unavailable right now'}
              </span>
            </div>
          </TabsContent>

          <TabsContent value="withdraw" className="mt-4 space-y-4">
            <div>
              <div className="mb-1.5 text-sm font-medium">To address</div>
              <Input
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="0x…"
                className="font-mono text-sm"
                data-testid="input-withdraw-address"
              />
              {me?.payoutAddress && toAddress === me.payoutAddress && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Prefilled with your linked wallet - you can send anywhere else too.
                </p>
              )}
              {toAddress.trim() !== '' && !addrOk && (
                <p className="mt-1 text-xs text-destructive">
                  An address starts with 0x followed by 40 letters and digits.
                </p>
              )}
            </div>
            <div>
              <div className="mb-1.5 text-sm font-medium">Amount</div>
              <div className="flex gap-2">
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  data-testid="input-withdraw-amount"
                />
                <Button
                  variant="secondary"
                  onClick={() => setAmount(wallet?.transferableUsdc ?? '')}
                  disabled={wallet?.transferableUsdc == null}
                  data-testid="button-withdraw-max"
                >
                  Max
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {wallet?.transferableUsdc != null
                  ? `Available to withdraw: ${wallet.transferableUsdc} test USDC (${wallet.reserveUsdc} test USDC stays behind for the network fee).`
                  : 'The available amount cannot be read right now.'}
              </p>
              {overMax && (
                <p className="mt-1 text-xs text-destructive">
                  That is more than the wallet can send after the network-fee reserve.
                </p>
              )}
            </div>
            {withdrawError && (
              <div
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                data-testid="text-withdraw-error"
              >
                {withdrawError}
              </div>
            )}
            {receipt && (
              <div
                className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground/90"
                data-testid="text-withdraw-success"
              >
                Sent {receipt.amountUsdc} test USDC.{' '}
                <a
                  href={receipt.explorerTxUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2 text-primary"
                  data-testid="link-withdraw-tx"
                >
                  View on ArcScan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <Button
              className="w-full"
              onClick={submit}
              disabled={!addrOk || !amountOk || overMax || withdraw.isPending}
              data-testid="button-withdraw-submit"
            >
              {withdraw.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {withdraw.isPending ? 'Sending…' : 'Withdraw'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Withdrawals are real transactions on the Arc testnet and cannot be
              undone once confirmed.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
