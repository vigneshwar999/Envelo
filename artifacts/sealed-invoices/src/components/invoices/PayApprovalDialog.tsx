import { useEffect, useRef, useState } from 'react';
import {
  useGetPayPreview,
  getGetPayPreviewQueryKey,
  paymentSubmitted,
  type PaymentSubmittedResult,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, ExternalLink, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import {
  hasBrowserWallet,
  payFromBrowserWallet,
  publicRpcUrlFor,
  WalletError,
} from '@/lib/wallet';

function shorten(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

/** Where the browser-wallet payment is, step by step, so the sheet can say so. */
type WalletStep =
  | { kind: 'idle' }
  | { kind: 'wallet' } // connecting, switching network, waiting for the user to sign
  | { kind: 'confirming'; txHash: string } // sent; the server is checking the receipt
  | { kind: 'error'; message: string; txHash?: string };

/** Errors from the generated client carry the HTTP status and the parsed body. */
function apiErrorOf(err: unknown): { status: number | null; message: string | null } {
  const e = err as { status?: unknown; data?: { error?: unknown } } | null;
  return {
    status: typeof e?.status === 'number' ? e.status : null,
    message: typeof e?.data?.error === 'string' ? e.data.error : null,
  };
}

// How long the sheet keeps asking the server about a sent transaction before
// handing off to the invoice page's own polling. Arc confirms in seconds.
const CONFIRM_RETRY_MS = 3000;
const CONFIRM_MAX_TRIES = 40;

/**
 * The wallet-style "Approve transaction" sheet shown before Pay proceeds.
 * Everything on it is a live server fact fetched when it opens: the exact
 * invoice amount, where the USDC lands, the registry contract, and - for the
 * sandbox's built-in wallet - a gas fee estimated at this moment, the exact
 * debit and the payer's balance. The verdict (canPay) is computed server-side
 * by the SAME rule the pay route enforces - this sheet never re-derives money
 * math. Nothing moves until Confirm.
 *
 * Two ways to pay, chosen by the invoice's network:
 *   custodial - sandbox only: Confirm asks the server to pay from the client's
 *               built-in wallet (test USDC).
 *   external  - the client's own browser wallet sends the exact transaction
 *               the server built (payInvoice on the registry with the amount
 *               attached); the server then verifies the receipt before the
 *               invoice is marked paid. This is the only way on a live (Arc
 *               Mainnet) invoice and is also offered on sandbox invoices.
 */
export function PayApprovalDialog({
  open,
  onOpenChange,
  invoiceId,
  onConfirm,
  confirmPending,
  onExternalPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  /** Custodial path: pay from the built-in sandbox wallet. */
  onConfirm: () => void;
  confirmPending?: boolean;
  /** External path: the server confirmed the browser-wallet payment on-chain. */
  onExternalPaid?: (result: PaymentSubmittedResult) => void;
}) {
  // Radix unmounts the content when closed, so each open refetches - the
  // fee and balance really are "at this moment", not stale cache.
  const preview = useGetPayPreview(invoiceId, {
    query: { enabled: open && !!invoiceId, queryKey: getGetPayPreviewQueryKey(invoiceId) },
  });
  const p = preview.data;
  const external = p?.paymentMode === 'external';
  const live = p?.networkMode === 'live';
  const insufficient = !external && p?.canPay === false;
  const walletAvailable = hasBrowserWallet();
  // The browser-wallet option exists whenever the server could build the
  // exact transaction (anchored on a v4 registry). On a live invoice it is
  // the only option; on the sandbox it sits next to the built-in wallet.
  const externalOffered = !!p?.transaction && !p.alreadyPaid;

  const [step, setStep] = useState<WalletStep>({ kind: 'idle' });
  // The hash of a payment this sheet has already handed to the wallet. Once
  // set, the sheet only ever re-checks that transaction: a second send while
  // the first is unresolved would either pay twice or revert and burn gas.
  const [sentHash, setSentHash] = useState<string | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    if (!open) {
      setStep({ kind: 'idle' });
      setSentHash(null);
    }
  }, [open]);

  const busy = step.kind === 'wallet' || step.kind === 'confirming';
  const cannotConfirm =
    preview.isLoading ||
    preview.isError ||
    !p ||
    external ||
    p.canPay !== true ||
    p.alreadyPaid ||
    !!p.unavailableReason ||
    !p.contractAddress ||
    !p.payeeAddress ||
    confirmPending ||
    busy ||
    // A wallet payment is already out; paying again from the built-in wallet
    // would only revert against it.
    !!sentHash;
  // Re-checking an already-sent payment only needs the server, so it stays
  // possible even if the preview refetches into an unavailable state.
  const cannotPayExternal = sentHash
    ? busy
    : preview.isLoading || preview.isError || !p || !externalOffered || !walletAvailable || busy || !!confirmPending;

  // The wallet accepted a transaction. Now the server checks the receipt: it
  // must find the registry's InvoicePaid event for this invoice before
  // anything is marked paid. Keep asking while Arc confirms.
  const confirmSubmitted = async (txHash: string) => {
    setStep({ kind: 'confirming', txHash });
    for (let attempt = 0; attempt < CONFIRM_MAX_TRIES; attempt++) {
      if (!openRef.current) return;
      let result: PaymentSubmittedResult;
      try {
        result = await paymentSubmitted(invoiceId, { txHash });
      } catch (err) {
        const { status, message } = apiErrorOf(err);
        // A 4xx is the server's verdict on this hash (reverted, wrong
        // invoice, wrong terms): nothing was paid, so a fresh payment may be
        // started. Anything else is a hiccup and the same hash is re-checked.
        const verdict = status !== null && status >= 400 && status < 500;
        if (verdict) setSentHash(null);
        setStep({
          kind: 'error',
          txHash: verdict ? undefined : txHash,
          message:
            message ??
            (verdict
              ? 'The server rejected that transaction as a payment for this invoice.'
              : 'The server could not be reached to verify the transaction. Nothing is lost: check again in a moment.'),
        });
        return;
      }
      if (result.status === 'paid') {
        onExternalPaid?.(result);
        return;
      }
      await new Promise((r) => setTimeout(r, CONFIRM_RETRY_MS));
    }
    setStep({
      kind: 'error',
      txHash,
      message:
        'The transaction was sent but Arc has not confirmed it yet. This page keeps checking; the invoice flips to paid as soon as it lands.',
    });
  };

  const payWithWallet = async () => {
    // Never a second send while the first is unresolved.
    if (sentHash) {
      await confirmSubmitted(sentHash);
      return;
    }
    if (!p?.transaction) return;
    const tx = p.transaction;
    const rpcUrl = publicRpcUrlFor(tx.chainId);
    if (!rpcUrl) {
      setStep({ kind: 'error', message: `Chain ${tx.chainId} is not an Arc network this app knows.` });
      return;
    }
    setStep({ kind: 'wallet' });
    let txHash: string;
    try {
      const sent = await payFromBrowserWallet(tx, {
        chainIdHex: tx.chainIdHex,
        name: p.network,
        rpcUrl,
        explorerBaseUrl: p.explorerBaseUrl,
      });
      txHash = sent.txHash;
    } catch (err) {
      const message =
        err instanceof WalletError ? err.message : 'The wallet could not send the payment.';
      setStep({ kind: 'error', message });
      return;
    }
    setSentHash(txHash);
    await confirmSubmitted(txHash);
  };

  const row = (label: string, testid: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right" data-testid={testid}>
        {preview.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          value
        )}
      </span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md bg-card/90 backdrop-blur-xl border-white/10" data-testid="dialog-pay-approve">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {external ? (
              <>Paying from your own wallet</>
            ) : p?.walletAddress ? (
              <>
                Paying from{' '}
                <span className="font-mono text-foreground" data-testid="text-pay-wallet">
                  {shorten(p.walletAddress)}
                </span>
              </>
            ) : (
              <>Paying from your built-in wallet</>
            )}
          </div>
          <DialogTitle className="pt-2 text-center text-xl">Approve transaction</DialogTitle>
          <DialogDescription className="text-center">
            {external
              ? `Review the payment before your wallet sends it on ${p?.network ?? 'Arc'}.`
              : 'Review exactly what leaves your wallet before anything moves on Arc.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="font-medium">Contract interaction</p>

          {row(
            'To',
            'text-pay-payee',
            p?.payeeAddress ? (
              <span className="flex flex-col items-end">
                <span>{p.payeeName ?? 'Payee'}</span>
                <a
                  href={`${p.explorerBaseUrl}/address/${p.payeeAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:underline"
                  title="View on the Arc explorer"
                >
                  {shorten(p.payeeAddress)}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-xs text-muted-foreground">
                  {p.paidToLinkedWallet ? 'their own wallet' : 'their built-in wallet'}
                </span>
              </span>
            ) : (
              <span className="text-xs">—</span>
            ),
          )}

          {row(
            'Contract',
            'text-pay-contract',
            p?.contractAddress ? (
              <a
                href={`${p.explorerBaseUrl}/address/${p.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-foreground hover:underline"
                title="View on the Arc explorer"
              >
                {shorten(p.contractAddress)}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            ) : (
              <span className="text-xs">Not deployed yet</span>
            ),
          )}

          {row(
            'Network',
            'text-pay-network',
            p ? (
              <>
                {p.network}{' '}
                <span className="text-xs text-muted-foreground">· chain {p.chainId}</span>
                {live && (
                  <span className="ml-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                    Live
                  </span>
                )}
              </>
            ) : (
              '—'
            ),
          )}

          <div className="space-y-2 border-t pt-3">
            {row(
              'Amount',
              'text-pay-amount',
              p ? <span className="font-medium">{p.amountUsdc} USDC</span> : '—',
            )}
            {external ? (
              row(
                'Network fee',
                'text-pay-fee',
                p?.alreadyPaid ? (
                  <span className="text-xs">Not applicable</span>
                ) : (
                  <span className="text-xs">Shown by your wallet before you sign</span>
                ),
              )
            ) : (
              <>
                {row(
                  'Network fee (est.)',
                  'text-pay-fee',
                  p ? (
                    p.alreadyPaid ? (
                      <span className="text-xs">Not applicable</span>
                    ) : (
                      <span>{p.feeEstimateUsdc ?? '0.1'} USDC</span>
                    )
                  ) : '—',
                )}
                {row(
                  'Total from your wallet',
                  'text-pay-total',
                  p?.totalUsdc != null ? (
                    <span className="font-semibold">{p.totalUsdc} USDC</span>
                  ) : (
                    <span className="text-xs">—</span>
                  ),
                )}
                {row(
                  'Your wallet balance',
                  'text-pay-balance',
                  p?.walletBalanceUsdc != null ? (
                    <span className={insufficient ? 'font-medium text-destructive' : 'font-medium'}>
                      {p.walletBalanceUsdc} USDC
                    </span>
                  ) : (
                    <span className="text-xs">Unreadable right now</span>
                  ),
                )}
              </>
            )}
          </div>

          {insufficient && (
            <div
              className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200"
              data-testid="notice-pay-insufficient"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Insufficient funds: this payment needs {p?.totalUsdc ?? 'more'} USDC in total and
                your wallet is about {p?.shortfallUsdc ?? 'a little'} USDC short.{' '}
                <a
                  href={p?.faucetUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                  data-testid="link-pay-faucet"
                >
                  Get free test USDC
                </a>{' '}
                (choose Arc Testnet, paste{' '}
                <span className="font-mono">{p?.walletAddress ? shorten(p.walletAddress) : 'your address'}</span>
                ), then reopen this sheet.
              </span>
            </div>
          )}

          {preview.isError && (
            <div
              className="flex gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs leading-relaxed text-destructive"
              data-testid="notice-pay-preview-error"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                The live transaction details could not be loaded. Close this sheet and try again
                before approving payment.
              </span>
            </div>
          )}

          {!preview.isLoading &&
            p &&
            !insufficient &&
            (p.alreadyPaid ||
              p.unavailableReason ||
              !p.contractAddress ||
              !p.payeeAddress ||
              (external ? !externalOffered : p.canPay !== true)) && (
            <div
              className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200"
              data-testid="notice-pay-unavailable"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {p.alreadyPaid
                  ? 'This invoice is already paid.'
                  : p.unavailableReason
                    ? p.unavailableReason
                    : !p.contractAddress
                      ? 'This invoice is still being anchored on Arc. Payment unlocks after its transaction confirms.'
                      : !p.payeeAddress
                        ? 'The payee wallet could not be resolved, so payment cannot be approved.'
                        : external
                          ? 'The payment transaction could not be built for this invoice, so it cannot be paid from a wallet yet.'
                          : 'The live fee or wallet balance is unavailable. Reopen this sheet once the Arc network responds.'}
              </span>
            </div>
          )}

          {!preview.isLoading && p && externalOffered && !walletAvailable && external && (
            <div
              className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200"
              data-testid="notice-pay-no-wallet"
            >
              <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                No browser wallet was found. Install MetaMask or another wallet extension, open
                this page in that browser, and try again. Live invoices are paid from your own
                wallet only.
              </span>
            </div>
          )}

          {step.kind === 'wallet' && (
            <div
              className="flex gap-2.5 rounded-lg border border-primary/30 bg-primary/10 p-4 text-xs leading-relaxed"
              data-testid="notice-pay-wallet-step"
            >
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              <span>
                Check your wallet. It may ask you to connect, switch to {p?.network ?? 'Arc'}, and
                then approve the payment.
              </span>
            </div>
          )}

          {step.kind === 'confirming' && (
            <div
              className="flex gap-2.5 rounded-lg border border-primary/30 bg-primary/10 p-4 text-xs leading-relaxed"
              data-testid="notice-pay-confirming"
            >
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              <span>
                Sent. Waiting for {p?.network ?? 'Arc'} to confirm{' '}
                <a
                  href={`${p?.explorerBaseUrl}/tx/${step.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono underline"
                >
                  {shorten(step.txHash)}
                </a>
                . The invoice is marked paid only after the registry's payment event is verified.
              </span>
            </div>
          )}

          {step.kind === 'error' && (
            <div
              className="flex gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs leading-relaxed text-destructive"
              data-testid="notice-pay-wallet-error"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {step.message}
                {step.txHash && (
                  <>
                    {' '}
                    <a
                      href={`${p?.explorerBaseUrl}/tx/${step.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono underline"
                    >
                      {shorten(step.txHash)}
                    </a>
                  </>
                )}
              </span>
            </div>
          )}

          <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
            {external ? (
              <>
                Your own wallet pays the invoice amount and the Arc gas; Envelo never holds the
                money. The amount goes to the payee's wallet through the registry contract, which
                checks it against the anchored terms and records the invoice as paid in the same
                transaction.
              </>
            ) : (
              <>
                You pay the invoice amount and Arc gas from your built-in wallet; Envelo does
                not sponsor gas. The invoice amount goes to the payee through the registry contract,
                which records the invoice as paid on-chain. If Arc cannot return a live estimate, the
                displayed fee defaults to 0.1 test USDC.
              </>
            )}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              data-testid="button-pay-cancel"
            >
              Cancel
            </Button>
            {external ? (
              <Button
                type="button"
                onClick={() => void payWithWallet()}
                disabled={cannotPayExternal}
                data-testid={sentHash ? 'button-pay-recheck' : 'button-pay-external'}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {step.kind === 'confirming' ? 'Confirming…' : 'Waiting for wallet…'}
                  </>
                ) : sentHash ? (
                  'Check again'
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" /> Pay from wallet
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onConfirm}
                disabled={cannotConfirm}
                data-testid="button-pay-confirm"
              >
                {confirmPending ? 'Paying…' : 'Confirm'}
              </Button>
            )}
          </div>
          {!external && externalOffered && walletAvailable && (
            <button
              type="button"
              onClick={() => void payWithWallet()}
              disabled={cannotPayExternal}
              className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
              data-testid={sentHash ? 'button-pay-recheck' : 'button-pay-external'}
            >
              {busy
                ? step.kind === 'confirming'
                  ? 'Confirming your wallet payment…'
                  : 'Waiting for your wallet…'
                : sentHash
                  ? 'Check your wallet payment again'
                  : 'Or pay from your own browser wallet instead'}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
