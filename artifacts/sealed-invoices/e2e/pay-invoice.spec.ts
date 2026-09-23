import { expect, test, type Browser, type Page } from "@playwright/test";
import { createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  apiGetJson,
  createInvoice,
  custodialAddressOf,
  custodialPrivateKeyOf,
  ensureReadyKey,
  mintSignInToken,
  requiredPersonaId,
  signIn,
} from "./helpers";

// Paying an invoice, both ways the product offers on the sandbox network:
//
//   1. from the built-in custodial wallet (the demo path), and
//   2. from the client's OWN browser wallet - the only path that exists on
//      Arc Mainnet, so it is exercised here on the testnet v4 registry where
//      it is also offered.
//
// For (2) the browser gets a minimal EIP-1193 provider standing in for
// MetaMask. It is not a mock of the CHAIN: eth_sendTransaction hands the
// server-built transaction to Node, which signs it with the client persona's
// funded sandbox key and broadcasts it to the real Arc Testnet RPC. The API
// then has to find the registry's InvoicePaid event in the real receipt
// before the invoice may flip to paid - exactly what a real wallet user
// triggers, minus the extension UI.
//
// Real money moves (0.01 test USDC per payment plus gas) from Signe to Sela;
// the global setup keeps both funded.

const SENDER_ID = requiredPersonaId("SEAL_SENDER_ID"); // Sela Sealer (payee)
const CLIENT_ID = requiredPersonaId("LOSTKEY_SENDER_ID"); // Signe Sender (payer)
const CLIENT_NAME = "Signe Sender";

const ARC_TESTNET_CHAIN_ID = 5042002;
const ARC_TESTNET_RPC = "https://rpc.testnet.arc.io";
const EXPLORER = "https://explorer.testnet.arc.io";

test.describe.configure({ mode: "serial" });

async function sealFor(
  browser: Browser,
  numberPrefix: string,
  marker: string,
): Promise<{ id: string; close: () => Promise<void> }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, await mintSignInToken(SENDER_ID));
  await ensureReadyKey(page);
  const { id } = await createInvoice(
    page,
    { id: CLIENT_ID, name: CLIENT_NAME },
    { numberPrefix, title: "Payment drill (automated)", description: marker },
  );
  // Payment is only offered once the fingerprint is anchored - the pay
  // transaction targets the registry that holds it.
  await expect
    .poll(
      async () =>
        (await apiGetJson(page, `/api/invoices/${id}`)).body?.anchorStatus,
      { timeout: 120_000, intervals: [2_000], message: "anchor never landed" },
    )
    .toBe("anchored");
  return { id, close: () => ctx.close() };
}

async function openAsClient(page: Page, id: string): Promise<void> {
  await page.goto(`/invoices/${id}`);
  await expect(page.getByTestId("badge-invoice-status")).toHaveText(
    "Awaiting Payment",
    {
      timeout: 30_000,
    },
  );
  await expect(page.getByTestId("button-pay")).toBeEnabled({ timeout: 30_000 });
  await page.getByTestId("button-pay").click();
  await expect(page.getByTestId("dialog-pay-approve")).toBeVisible({
    timeout: 10_000,
  });
  // The sheet states the real network, the real registry and the exact amount.
  await expect(page.getByTestId("text-pay-network")).toContainText(
    "Arc Testnet",
  );
  await expect(page.getByTestId("text-pay-contract")).toContainText(
    /0x[0-9a-fA-F]{6}/,
  );
  await expect(page.getByTestId("text-pay-amount")).toContainText("0.01 USDC");
}

async function expectPaid(page: Page, id: string, marker: string) {
  await expect(page.getByTestId("badge-invoice-status")).toHaveText("Paid", {
    timeout: 90_000,
  });
  const { status, body } = await apiGetJson(page, `/api/invoices/${id}`);
  expect(status).toBe(200);
  expect(body.status).toBe("paid");
  // The audit trail names the payment and links the real transaction on the
  // invoice's own explorer - never a chain guessed from a global constant.
  await expect(page.getByText(/paid 0\.01 USDC/)).toBeVisible({
    timeout: 30_000,
  });
  const txLinks = page.locator(`a[href^="${EXPLORER}/tx/0x"]`);
  await expect(txLinks.last()).toBeVisible();
  // The content is untouched by payment: the client can still open it.
  await page.getByTestId("button-open-envelope").click();
  await expect(page.getByText(marker)).toBeVisible({ timeout: 30_000 });
  return body;
}

test("client pays from the built-in sandbox wallet", async ({ browser }) => {
  test.setTimeout(240_000);
  const marker = `Custodial pay drill ${Date.now()}`;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let sealed: Awaited<ReturnType<typeof sealFor>> | null = null;
  try {
    // Client first: the seal must target the key her browser holds right now.
    await signIn(page, await mintSignInToken(CLIENT_ID));
    await ensureReadyKey(page);
    sealed = await sealFor(browser, "PAYC", marker);
    await openAsClient(page, sealed.id);
    // Sandbox: fee, total and the payer's live balance are all shown, and the
    // built-in wallet is the primary action.
    await expect(page.getByTestId("text-pay-fee")).toBeVisible();
    await expect(page.getByTestId("text-pay-total")).toBeVisible();
    await expect(page.getByTestId("text-pay-balance")).toContainText(/USDC/);
    await expect(page.getByTestId("button-pay-confirm")).toBeEnabled({
      timeout: 15_000,
    });
    await page.getByTestId("button-pay-confirm").click();
    await expect(page.getByTestId("dialog-pay-approve")).toBeHidden({
      timeout: 90_000,
    });
    const paid = await expectPaid(page, sealed.id, marker);
    // Custodial payments leave from the client's sandbox wallet.
    expect(paid.payerAddress?.toLowerCase()).toBe(
      (await custodialAddressOf(CLIENT_ID)).toLowerCase(),
    );
  } finally {
    await ctx.close();
    await sealed?.close();
  }
});

test("client pays from their own browser wallet and the server verifies the receipt", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const marker = `Wallet pay drill ${Date.now()}`;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let sealed: Awaited<ReturnType<typeof sealFor>> | null = null;
  try {
    // Node holds the signing key; the page only ever sees an address.
    const account = privateKeyToAccount(await custodialPrivateKeyOf(CLIENT_ID));
    const chain = defineChain({
      id: ARC_TESTNET_CHAIN_ID,
      name: "Arc Testnet",
      nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
      rpcUrls: { default: { http: [ARC_TESTNET_RPC] } },
    });
    const wallet = createWalletClient({
      account,
      chain,
      transport: http(ARC_TESTNET_RPC),
    });
    const sent: Array<{
      to: string;
      data: string;
      value: string;
      from: string;
    }> = [];
    await page.exposeFunction(
      "__e2eSendTransaction",
      async (tx: {
        from: string;
        to: `0x${string}`;
        data: `0x${string}`;
        value: `0x${string}`;
      }) => {
        if (tx.from.toLowerCase() !== account.address.toLowerCase()) {
          throw new Error(
            `transaction from ${tx.from}, wallet holds ${account.address}`,
          );
        }
        sent.push(tx);
        return await wallet.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: BigInt(tx.value),
        });
      },
    );
    // A wallet on the wrong network first, so the app has to ask for the
    // switch - the request a real extension would show a prompt for.
    await page.addInitScript(
      ({ address, arcChainIdHex }) => {
        let chainId = "0x1";
        const calls: string[] = [];
        (window as any).__e2eWalletCalls = calls;
        (window as any).ethereum = {
          isMetaMask: true,
          async request({
            method,
            params,
          }: {
            method: string;
            params?: any[];
          }) {
            calls.push(method);
            switch (method) {
              case "eth_requestAccounts":
              case "eth_accounts":
                return [address];
              case "eth_chainId":
                return chainId;
              case "wallet_switchEthereumChain": {
                const wanted = params?.[0]?.chainId;
                if (wanted !== arcChainIdHex) {
                  throw Object.assign(new Error("Unrecognized chain"), {
                    code: 4902,
                  });
                }
                chainId = wanted;
                return null;
              }
              case "eth_sendTransaction":
                return await (window as any).__e2eSendTransaction(params?.[0]);
              default:
                throw new Error(`mock wallet: unsupported method ${method}`);
            }
          },
          on() {},
          removeListener() {},
        };
      },
      {
        address: account.address,
        arcChainIdHex: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`,
      },
    );

    await signIn(page, await mintSignInToken(CLIENT_ID));
    await ensureReadyKey(page);
    // Client first: the seal must target the key her browser holds right now.
    sealed = await sealFor(browser, "PAYW", marker);
    await openAsClient(page, sealed.id);

    // The server's own description of the payment, to compare the signed
    // transaction against afterwards.
    const preview = (
      await apiGetJson(page, `/api/invoices/${sealed.id}/pay-preview`)
    ).body;
    expect(preview.transaction?.chainId).toBe(ARC_TESTNET_CHAIN_ID);
    expect(preview.transaction?.to?.toLowerCase()).toBe(
      preview.contractAddress?.toLowerCase(),
    );

    // On the sandbox the browser wallet is the secondary option next to the
    // built-in one; both are offered because the anchor is on a v4 registry.
    await expect(page.getByTestId("button-pay-confirm")).toBeVisible();
    const external = page.getByTestId("button-pay-external");
    await expect(external).toBeEnabled({ timeout: 15_000 });
    await external.click();
    // The wallet reported a hash; now the app waits for the server to see the
    // InvoicePaid event in the real receipt before calling it paid.
    await expect(page.getByTestId("notice-pay-confirming")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("dialog-pay-approve")).toBeHidden({
      timeout: 120_000,
    });
    const paid = await expectPaid(page, sealed.id, marker);

    // The wallet was asked to switch to Arc Testnet before signing, and the
    // transaction it signed is the one the server built: registry contract,
    // exact amount, paid by the wallet's own address.
    const calls: string[] = await page.evaluate(
      () => (window as any).__e2eWalletCalls,
    );
    expect(calls).toContain("wallet_switchEthereumChain");
    expect(calls.indexOf("wallet_switchEthereumChain")).toBeLessThan(
      calls.indexOf("eth_sendTransaction"),
    );
    expect(sent).toHaveLength(1);
    expect(BigInt(sent[0].value)).toBe(10_000_000_000_000_000n); // 0.01 USDC, 18 decimals
    expect(sent[0].to.toLowerCase()).toBe(
      preview.contractAddress.toLowerCase(),
    );
    expect(sent[0].data).toBe(preview.transaction.data);
    expect(paid.payerAddress?.toLowerCase()).toBe(
      account.address.toLowerCase(),
    );
    const lastTx = await page
      .locator(`a[href^="${EXPLORER}/tx/0x"]`)
      .last()
      .getAttribute("href");
    expect(lastTx).toBe(`${EXPLORER}/tx/${paid.payTxHash}`);
  } finally {
    await ctx.close();
    await sealed?.close();
  }
});
