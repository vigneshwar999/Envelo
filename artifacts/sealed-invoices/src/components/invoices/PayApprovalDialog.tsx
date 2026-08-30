import { useGetPayPreview, getGetPayPreviewQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';

function shorten(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

/**
 * The wallet-style "Approve transaction" sheet shown before Pay proceeds.
 * Everything on it is a live server fact fetched when it opens: the exact
 * invoice amount, a gas fee estimated at this moment, their sum (the exact
 * debit), the payer's real wallet balance, and where the USDC lands. The
 * verdict (canPay) is computed server-side by the SAME rule the pay route
 * enforces - this sheet never re-derives money math. Nothing moves until
 * Confirm.
 */
export function PayApprovalDialog({
  open,
  onOpenChange,
  invoiceId,
  onConfirm,
  confirmPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  onConfirm: () => void;
  confirmPending?: boolean;
}) {
  // Radix unmounts the content when closed, so each open refetches - the
  // fee and balance really are "at this moment", not stale cache.
  const preview = useGetPayPreview(invoiceId, {
    query: { enabled: open && !!invoiceId, queryKey: getGetPayPreviewQueryKey(invoiceId) },
  });
  const p = preview.data;
  const insufficient = p?.canPay === false;
  const cannotConfirm =
    preview.isLoading ||
    preview.isError ||
    !p ||
    p.canPay !== true ||
    p.alreadyPaid ||
    !p.contractAddress ||
    !p.payeeAddress ||
    confirmPending;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-pay-approve">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {p?.walletAddress ? (
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
            Review exactly what leaves your wallet before anything moves on Arc.
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
                  title="View on Arcscan"
                >
                  {shorten(p.payeeAddress)}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-xs text-muted-foreground">
                  {p.paidToLinkedWallet ? 'their linked wallet' : 'their built-in wallet'}
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
                title="View on Arcscan"
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
          </div>

          {insufficient && (
            <div
              className="flex gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
              data-testid="notice-pay-insufficient"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Insufficient funds: this payment needs {p?.totalUsdc ?? 'more'} USDC in total and
                your wallet is about {p?.shortfallUsdc ?? 'a little'} USDC short.{' '}
                <a
                  href={p?.faucetUrl}
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
              className="flex gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive"
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
            (p.alreadyPaid || !p.contractAddress || !p.payeeAddress || p.canPay !== true) && (
            <div
              className="flex gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
              data-testid="notice-pay-unavailable"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {p.alreadyPaid
                  ? 'This invoice is already paid.'
                  : !p.contractAddress
                    ? 'The Arc registry is not ready yet, so payment cannot be approved.'
                    : !p.payeeAddress
                      ? 'The payee wallet could not be resolved, so payment cannot be approved.'
                      : 'The live fee or wallet balance is unavailable. Reopen this sheet once the Arc network responds.'}
              </span>
            </div>
          )}

          <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
            You pay the invoice amount and Arc gas from your built-in wallet; Sealed Invoices does
            not sponsor gas. The invoice amount goes to the payee through the registry contract,
            which records the invoice as paid on-chain. If Arc cannot return a live estimate, the
            displayed fee defaults to 0.1 test USDC.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-pay-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={cannotConfirm}
            data-testid="button-pay-confirm"
          >
            {confirmPending ? 'Paying…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
