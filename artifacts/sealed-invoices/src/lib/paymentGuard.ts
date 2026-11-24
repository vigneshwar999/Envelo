// A last check in the browser before a payment reaches the user's wallet.
//
// The server builds the payment transaction. If the server (or anything
// between it and this page) were ever compromised, it could try to hand the
// wallet a different contract, a different call, or a different amount. This
// guard only lets a transaction through when it matches facts the page knows
// on its own:
//   - the contract is Envelo's official registry for that Arc network
//     (hardcoded below, not taken from the server),
//   - the call is payInvoice and nothing else,
//   - the payee and amount inside it are exactly what the sheet displays.
// Envelo never asks a wallet for signatures, token approvals or permits, and
// this module never sends anything itself.

/** SealedInvoiceRegistry v4, per Arc network. Must match api-server networks.ts. */
export const OFFICIAL_REGISTRIES: Readonly<Record<number, string>> = {
  5042: '0xa27cc871eee4a86ed5c5cb3f11315bff4ca2e338', // Arc Mainnet
  5042002: '0xde0565b22c4451e714c81f5a0ce5f83b6d11e51d', // Arc Testnet
};

/** payInvoice(bytes32 invoiceKey, address payee, bytes32 salt) */
export const PAY_INVOICE_SELECTOR = '0x5bf63fea';

const PAY_CALLDATA = /^0x5bf63fea[0-9a-f]{192}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;

export interface PaymentRequestToCheck {
  chainId: number;
  chainIdHex: string;
  to: string;
  data: string;
  value: string;
}

export interface WhatTheSheetShows {
  chainId: number;
  /** Decimal USDC string, e.g. "1500.00". */
  amountUsdc: string;
  payeeAddress: string | null;
}

/** "12.5" -> 12500000000000000000n (native USDC on Arc has 18 decimals). */
export function usdcToWei(amount: string): bigint | null {
  const m = /^(\d{1,15})(?:\.(\d{1,18}))?$/.exec(amount.trim());
  if (!m) return null;
  return BigInt(m[1]) * 10n ** 18n + BigInt((m[2] ?? '').padEnd(18, '0'));
}

/**
 * Null when the transaction is exactly the payment the sheet shows, otherwise
 * a plain sentence saying what was wrong. Nothing should be sent on non-null.
 */
export function checkPaymentRequest(tx: PaymentRequestToCheck, shown: WhatTheSheetShows): string | null {
  const registry = OFFICIAL_REGISTRIES[tx.chainId];
  if (!registry) return `Chain ${tx.chainId} is not an Arc network Envelo pays on.`;
  if (tx.chainId !== shown.chainId) return 'The payment is for a different network than this invoice.';
  if (tx.chainIdHex.toLowerCase() !== `0x${tx.chainId.toString(16)}`) {
    return 'The payment names two different networks.';
  }
  if (tx.to.toLowerCase() !== registry) {
    return "The payment does not go to Envelo's official registry contract.";
  }
  const data = tx.data.toLowerCase();
  if (!PAY_CALLDATA.test(data)) return 'The payment is not a plain payInvoice call.';
  const payeeInCall = `0x${data.slice(10 + 64 + 24, 10 + 128)}`;
  const payeeShown = shown.payeeAddress?.toLowerCase() ?? '';
  if (!ADDRESS.test(payeeShown) || payeeInCall !== payeeShown) {
    return 'The payee inside the payment is not the payee shown on this sheet.';
  }
  const expected = usdcToWei(shown.amountUsdc);
  let value: bigint;
  try {
    value = BigInt(tx.value);
  } catch {
    return 'The payment amount is not a valid number.';
  }
  if (expected === null || expected <= 0n || value !== expected) {
    return 'The payment amount is not the invoice amount shown on this sheet.';
  }
  return null;
}
