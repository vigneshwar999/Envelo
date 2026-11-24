import { describe, expect, it } from "vitest";
import { ARC_MAINNET, ARC_TESTNET } from "../src/chain/networks";
import { encodePayCall } from "../src/chain/registry";
import {
  OFFICIAL_REGISTRIES,
  PAY_INVOICE_SELECTOR,
  checkPaymentRequest,
  usdcToWei,
} from "../../sealed-invoices/src/lib/paymentGuard";

// The web app's last check before a wallet opens. It keeps its own list of
// registries on purpose (it must not trust the server), so this test fails
// if that list and the server's networks ever drift apart.
describe("browser payment guard", () => {
  it("knows the same registries as the server", () => {
    expect(OFFICIAL_REGISTRIES[ARC_MAINNET.chainId]).toBe(ARC_MAINNET.registryAddress?.toLowerCase());
    expect(OFFICIAL_REGISTRIES[ARC_TESTNET.chainId]).toBe(ARC_TESTNET.registryAddress?.toLowerCase());
  });

  const payee = "0x72A1EC32165EC55c35d8D3DEfF56ED351515A084";
  const salt = `0x${"ab".repeat(32)}` as const;
  const data = encodePayCall({ invoiceId: "11111111-1111-1111-1111-111111111111", payee, salt });
  const tx = {
    chainId: 5042,
    chainIdHex: "0x13b2",
    to: OFFICIAL_REGISTRIES[5042]!,
    data,
    value: `0x${usdcToWei("1500.00")!.toString(16)}`,
  };
  const shown = { chainId: 5042, amountUsdc: "1500.00", payeeAddress: payee };

  it("uses the real payInvoice selector", () => {
    expect(data.slice(0, 10)).toBe(PAY_INVOICE_SELECTOR);
  });

  it("lets the exact server-built payment through", () => {
    expect(checkPaymentRequest(tx, shown)).toBeNull();
  });

  it.each([
    ["another contract", { ...tx, to: "0x000000000000000000000000000000000000dEaD" }, shown],
    ["a different amount", { ...tx, value: "0x1" }, shown],
    ["a payee not on screen", tx, { ...shown, payeeAddress: "0x460a039487c9972b70c5b789BDDecF5187cA86DA" }],
    ["an approve() call", { ...tx, data: `0x095ea7b3${data.slice(10)}` }, shown],
    ["the wrong network", { ...tx, chainId: 5042002, chainIdHex: "0x4cef52" }, shown],
    ["trailing calldata", { ...tx, data: `${data}00` }, shown],
  ])("blocks %s", (_name, badTx, badShown) => {
    expect(checkPaymentRequest(badTx, badShown)).not.toBeNull();
  });
});
