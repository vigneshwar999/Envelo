import { useGetAnchorPreview, getGetAnchorPreviewQueryKey } from '@workspace/api-client-react';
import { useMe } from '@/context/UserContext';
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
 * The wallet-style "Approve transaction" sheet shown before Seal & Send
 * proceeds. Everything on it is a live server fact fetched when it opens:
 * the real registry contract, the real network, a fee estimated at current
 * Arc gas prices, and the sender's own wallet balance - because the sender's
 * built-in wallet pays this anchor. The affordability verdict (canAfford)
 * comes from the server's rule, the same one the create route enforces;
 * this sheet never does money math itself. Nothing is sealed or sent until
 * Confirm.
 */
export function AnchorApprovalDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { me } = useMe();

  // Radix unmounts the content when closed, so each open refetches - the
  // estimate and balance really are "at this moment", not stale cache.
  const preview = useGetAnchorPreview({
    query: { enabled: open, queryKey: getGetAnchorPreviewQueryKey() },
  });
  const p = preview.data;
  const insufficient = p?.canAfford === false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-anchor-approve">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {me?.walletAddress ? (
              <>
                Signed in as{' '}
                <span className="font-mono text-foreground">{shorten(me.walletAddress)}</span>
              </>
            ) : (
              <>Signed in as {me?.displayName ?? 'you'}</>
            )}
          </div>
          <DialogTitle className="pt-2 text-center text-xl">Approve transaction</DialogTitle>
          <DialogDescription className="text-center">
            Review what will be written to Arc before your invoice is sealed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="font-medium">Contract interaction</p>

          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Contract</span>
            {preview.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : p?.contractAddress ? (
              <a
                href={`${p.explorerBaseUrl}/address/${p.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-foreground hover:underline"
                title="View on Arcscan"
                data-testid="text-anchor-contract"
              >
                {shorten(p.contractAddress)}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            ) : (
              <span className="text-right text-xs" data-testid="text-anchor-contract">
                Deploying - anchors automatically once live
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Network</span>
            <span data-testid="text-anchor-network">
              {preview.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : p ? (
                <>
                  {p.network}{' '}
                  <span className="text-xs text-muted-foreground">· chain {p.chainId}</span>
                </>
              ) : (
                '—'
              )}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">Network fee (est.)</span>
            <span className="text-right" data-testid="text-anchor-fee">
              {preview.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : p?.feeEstimateUsdc != null ? (
                <span className="font-medium">{p.feeEstimateUsdc} USDC</span>
              ) : (
                <span className="text-xs">
                  Estimate unavailable right now - the fee is re-checked when anchoring runs
                </span>
              )}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">Your wallet balance</span>
            <span className="text-right" data-testid="text-anchor-balance">
              {preview.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : p?.walletBalanceUsdc != null ? (
                <span className={insufficient ? 'font-medium text-destructive' : 'font-medium'}>
                  {p.walletBalanceUsdc} USDC
                </span>
              ) : (
                <span className="text-xs">Unreadable right now</span>
              )}
            </span>
          </div>

          {insufficient && (
            <div
              className="flex gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
              data-testid="notice-anchor-insufficient"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Insufficient funds: this anchor is paid from your wallet and you are about{' '}
                {p?.shortfallUsdc ?? 'a little'} USDC short.{' '}
                <a
                  href={p?.faucetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                  data-testid="link-anchor-faucet"
                >
                  Get free test USDC
                </a>{' '}
                (choose Arc Testnet, paste{' '}
                <span className="font-mono">{p?.walletAddress ? shorten(p.walletAddress) : 'your address'}</span>
                ), then try again.
              </span>
            </div>
          )}

          <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
            Your built-in wallet submits and pays this anchor on Arc. Only the invoice
            fingerprint goes on-chain - the contents stay encrypted in your browser.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-anchor-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={insufficient}
            data-testid="button-anchor-confirm"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
