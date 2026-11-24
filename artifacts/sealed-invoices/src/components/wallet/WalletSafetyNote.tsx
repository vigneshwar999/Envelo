import { ShieldCheck } from 'lucide-react';

/**
 * What Envelo will and will not ask a browser wallet for. Shown wherever a
 * wallet can open (linking a payout wallet, paying an invoice), so people can
 * spot a fake prompt: anything outside this list did not come from Envelo.
 */
export function WalletSafetyNote({ context }: { context: 'link' | 'pay' }) {
  return (
    <div
      className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-xs leading-relaxed text-foreground/85"
      data-testid={`note-wallet-safety-${context}`}
    >
      <div className="mb-2 flex items-center gap-2 font-medium text-emerald-300">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        What Envelo asks your wallet for
      </div>
      <ul className="list-disc space-y-1 pl-5">
        {context === 'link' ? (
          <li>Only to share your address. Linking moves no money, and you can paste the address instead.</li>
        ) : (
          <li>
            To share your address, switch to Arc, and send this one payment to Envelo&apos;s registry
            contract. Check the amount in your wallet before approving.
          </li>
        )}
        <li>
          Never to sign a message, approve or permit tokens, or reveal your seed phrase. If a prompt
          asks for any of that, reject it: it is not from Envelo.
        </li>
        {context === 'link' && (
          <li>Tip: link a separate wallet just for receiving, not the wallet that holds your savings.</li>
        )}
      </ul>
    </div>
  );
}
