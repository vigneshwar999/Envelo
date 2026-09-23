import { describe, expect, it } from "vitest";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  keccak256,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { REGISTRY_ABI } from "./registryArtifact";
import {
  encodeAnchorCall,
  encodePayCall,
  findInvoicePaidLog,
  invoiceKey,
  isBytes32Hex,
  newPaymentSalt,
  paymentCommitment,
  paymentSettlesInvoice,
} from "./registry";

const invoiceId = "0f3a2b1c-4d5e-4f60-8a71-92b3c4d5e6f7";
const payee = "0x000000000000000000000000000000000000dEaD" as Address;
const other = "0x00000000000000000000000000000000000000A1" as Address;
const registry = "0x1111111111111111111111111111111111111111" as Address;
const salt = `0x${"ab".repeat(32)}` as Hex;
const amountWei = parseUnits("1500.00", 18);

function paidLog(args: {
  address: Address;
  key: Hex;
  payer: Address;
  payee: Address;
  amount: bigint;
}) {
  const topics = encodeEventTopics({
    abi: REGISTRY_ABI,
    eventName: "InvoicePaid",
    args: { invoiceKey: args.key, payer: args.payer, payee: args.payee },
  });
  return {
    address: args.address,
    topics: topics as [Hex, ...Hex[]],
    data: encodeAbiParameters([{ type: "uint256" }], [args.amount]),
  };
}

describe("payment commitment", () => {
  it("matches the Solidity preimage rule keccak256(abi.encode(key, payee, amount, salt))", () => {
    const expected = keccak256(
      encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: "address" },
          { type: "uint256" },
          { type: "bytes32" },
        ],
        [invoiceKey(invoiceId), payee, amountWei, salt],
      ),
    );
    expect(paymentCommitment({ invoiceId, payee, amountWei, salt })).toBe(expected);
  });

  it("changes when any term changes", () => {
    const base = paymentCommitment({ invoiceId, payee, amountWei, salt });
    expect(paymentCommitment({ invoiceId, payee: other, amountWei, salt })).not.toBe(base);
    expect(
      paymentCommitment({ invoiceId, payee, amountWei: amountWei - 1n, salt }),
    ).not.toBe(base);
    expect(
      paymentCommitment({ invoiceId, payee, amountWei, salt: `0x${"cd".repeat(32)}` }),
    ).not.toBe(base);
  });

  it("generates fresh 32-byte salts", () => {
    const a = newPaymentSalt();
    const b = newPaymentSalt();
    expect(isBytes32Hex(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(isBytes32Hex("0x1234")).toBe(false);
    expect(isBytes32Hex(null)).toBe(false);
  });
});

describe("calldata", () => {
  it("encodes anchorInvoice(key, fingerprint, commitment)", () => {
    const commitment = paymentCommitment({ invoiceId, payee, amountWei, salt });
    const fingerprintHex = "ff".repeat(32);
    const data = encodeAnchorCall({ invoiceId, fingerprintHex, commitment });
    const decoded = decodeFunctionData({ abi: REGISTRY_ABI, data });
    expect(decoded.functionName).toBe("anchorInvoice");
    expect(decoded.args).toEqual([invoiceKey(invoiceId), `0x${fingerprintHex}`, commitment]);
  });

  it("encodes payInvoice(key, payee, salt)", () => {
    const data = encodePayCall({ invoiceId, payee, salt });
    const decoded = decodeFunctionData({ abi: REGISTRY_ABI, data });
    expect(decoded.functionName).toBe("payInvoice");
    expect(decoded.args).toEqual([invoiceKey(invoiceId), payee, salt]);
  });
});

describe("InvoicePaid log validation", () => {
  const key = invoiceKey(invoiceId);

  it("finds the event emitted by the registry for this invoice", () => {
    const log = paidLog({ address: registry, key, payer: other, payee, amount: amountWei });
    expect(findInvoicePaidLog([log], registry, invoiceId)).toEqual({
      payer: other,
      payee,
      amountWei,
    });
  });

  it("ignores a look-alike event from another contract", () => {
    const log = paidLog({ address: other, key, payer: other, payee, amount: amountWei });
    expect(findInvoicePaidLog([log], registry, invoiceId)).toBeNull();
  });

  it("ignores events for a different invoice", () => {
    const log = paidLog({
      address: registry,
      key: invoiceKey("some-other-invoice"),
      payer: other,
      payee,
      amount: amountWei,
    });
    expect(findInvoicePaidLog([log], registry, invoiceId)).toBeNull();
  });

  it("only settles when payee and exact amount match the committed terms", () => {
    const event = { payer: other, payee, amountWei };
    expect(paymentSettlesInvoice(event, { payee, amountWei })).toBe(true);
    expect(paymentSettlesInvoice(event, { payee: other, amountWei })).toBe(false);
    expect(paymentSettlesInvoice(event, { payee, amountWei: amountWei + 1n })).toBe(false);
    expect(
      paymentSettlesInvoice(event, { payee: payee.toLowerCase() as Address, amountWei }),
    ).toBe(true);
  });
});
