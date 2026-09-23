// Pure helpers for talking to SealedInvoiceRegistry v4: the on-chain key of
// an invoice, the payment commitment an anchor carries, calldata builders,
// and the InvoicePaid log check that decides whether a payment counts.
// No network access here, so every rule is unit-testable.
import { randomBytes } from "node:crypto";
import {
  decodeEventLog,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  toBytes,
  type Address,
  type Hex,
  type Log,
} from "viem";
import { REGISTRY_ABI } from "./registryArtifact";
import { REGISTRY_V3_ABI } from "./registryV3Abi";

/** The onchain key for an invoice: keccak256 of its UUID string. */
export function invoiceKey(invoiceId: string): Hex {
  return keccak256(toBytes(invoiceId));
}

/** 32 random bytes, hex encoded - one per invoice, fixed at creation. */
export function newPaymentSalt(): Hex {
  return `0x${randomBytes(32).toString("hex")}`;
}

export function isBytes32Hex(value: string | null | undefined): value is Hex {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Mirrors SealedInvoiceRegistry.paymentCommitment exactly:
 * keccak256(abi.encode(invoiceKey, payee, amount, salt)).
 */
export function paymentCommitment(args: {
  invoiceId: string;
  payee: Address;
  amountWei: bigint;
  salt: Hex;
}): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "address" },
        { type: "uint256" },
        { type: "bytes32" },
      ],
      [invoiceKey(args.invoiceId), args.payee, args.amountWei, args.salt],
    ),
  );
}

export function encodeAnchorCall(args: {
  invoiceId: string;
  fingerprintHex: string;
  commitment: Hex;
}): Hex {
  return encodeFunctionData({
    abi: REGISTRY_ABI,
    functionName: "anchorInvoice",
    args: [
      invoiceKey(args.invoiceId),
      `0x${args.fingerprintHex.replace(/^0x/, "")}` as Hex,
      args.commitment,
    ],
  });
}

/** v4 payment calldata: the payee and salt must reproduce the commitment. */
export function encodePayCall(args: {
  invoiceId: string;
  payee: Address;
  salt: Hex;
}): Hex {
  return encodeFunctionData({
    abi: REGISTRY_ABI,
    functionName: "payInvoice",
    args: [invoiceKey(args.invoiceId), args.payee, args.salt],
  });
}

/** v3 payment calldata, for invoices still pinned to the old testnet registry. */
export function encodePayCallV3(args: { invoiceId: string; payee: Address }): Hex {
  return encodeFunctionData({
    abi: REGISTRY_V3_ABI,
    functionName: "payInvoice",
    args: [invoiceKey(args.invoiceId), args.payee],
  });
}

export interface InvoicePaidEvent {
  payer: Address;
  payee: Address;
  amountWei: bigint;
}

/**
 * Find the InvoicePaid event for one invoice among a receipt's logs. Only a
 * log emitted BY the registry itself counts - any contract can emit an event
 * with the same shape, so the address check is what makes this proof.
 */
export function findInvoicePaidLog(
  logs: readonly Pick<Log, "address" | "data" | "topics">[],
  registryAddress: Address,
  invoiceId: string,
): InvoicePaidEvent | null {
  const key = invoiceKey(invoiceId).toLowerCase();
  for (const log of logs) {
    if (log.address.toLowerCase() !== registryAddress.toLowerCase()) continue;
    let decoded;
    try {
      decoded = decodeEventLog({
        abi: REGISTRY_ABI,
        eventName: "InvoicePaid",
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
    } catch {
      continue;
    }
    const a = decoded.args as {
      invoiceKey: Hex;
      payer: Address;
      payee: Address;
      amount: bigint;
    };
    if (a.invoiceKey.toLowerCase() !== key) continue;
    return { payer: a.payer, payee: a.payee, amountWei: a.amount };
  }
  return null;
}

/**
 * Does a confirmed InvoicePaid event settle THIS invoice? The amount must be
 * exact and the payee must be the address committed at anchor time. The
 * contract already enforces both through the commitment, but the server
 * re-checks so a wrong registry address or ABI can never mark a wrong
 * payment as good.
 */
export function paymentSettlesInvoice(
  event: InvoicePaidEvent,
  expected: { payee: Address; amountWei: bigint },
): boolean {
  return (
    event.amountWei === expected.amountWei &&
    event.payee.toLowerCase() === expected.payee.toLowerCase()
  );
}
