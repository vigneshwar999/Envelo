import { expect, test, type Page } from "@playwright/test";
import { apiGetJson, mintSignInToken, signIn } from "./helpers";

// The header wallet menu and its Deposit & withdraw dialog, driven against
// the REAL app and API. The menu's balance must agree with a fresh read of
// GET /api/users/me/wallet, the deposit address must be the account's real
// custodial address (text and QR), and the withdraw route must refuse bad
// requests with honest explanations. NO MONEY MOVES in this spec: every
// withdrawal it attempts is one the server must reject.
//
// Persona: Ava Auditor - also used by wallet-gating.spec.ts, which depends
// on her balance staying put. This spec keeps that promise by never issuing
// a withdrawal that could succeed.

const TEST_USER_ID =
  process.env.WALLET_MENU_TEST_USER_ID ?? "user_3IXZ7cQKd4sccYTDtW8gk7N9ZJA";

/** POST JSON through the browser's own signed-in session. */
async function postJson(
  page: Page,
  path: string,
  body: unknown,
): Promise<{ status: number; body: any }> {
  return await page.evaluate(
    async ({ p, b }) => {
      const res = await fetch(p, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      });
      let out: any = null;
      try {
        out = await res.json();
      } catch {
        // non-JSON response: status still tells the story
      }
      return { status: res.status, body: out };
    },
    { p: path, b: body },
  );
}

test("wallet menu shows the real balance and address, and withdrawals fail honestly", async ({
  page,
}) => {
  const token = await mintSignInToken(TEST_USER_ID);
  await signIn(page, token);
  await page.goto("/dashboard");

  // ---- The menu itself ----
  await page.getByTestId("button-wallet-menu").click();

  // The yardstick: a FRESH wallet read through the same session.
  const wallet = await apiGetJson(page, "/api/users/me/wallet");
  expect(wallet.status).toBe(200);
  const address: string = wallet.body.address;
  expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);

  const balanceText = page.getByTestId("text-menu-balance");
  await expect(balanceText).toBeVisible({ timeout: 20_000 });
  if (wallet.body.balanceUsdc != null) {
    await expect(balanceText).toHaveText(`${wallet.body.balanceUsdc} test USDC`);
  } else {
    await expect(balanceText).toHaveText("Balance unavailable");
  }

  // The shortened address in the menu is the custodial wallet, not junk.
  await expect(page.getByTestId("text-menu-address")).toContainText(
    address.slice(0, 8),
  );

  // ---- Deposit tab ----
  await page.getByTestId("button-menu-deposit").click();
  await expect(page.getByTestId("text-deposit-address")).toHaveText(address);
  await expect(page.getByTestId("qr-deposit").locator("svg")).toBeVisible();
  await expect(page.getByTestId("text-dialog-balance")).toBeVisible();
  await expect(page.getByTestId("button-copy-address")).toBeEnabled();

  // ---- Withdraw tab: client-side gate ----
  await page.getByTestId("tab-withdraw").click();
  await page.getByTestId("input-withdraw-address").fill("not-an-address");
  await page.getByTestId("input-withdraw-amount").fill("0.01");
  await expect(page.getByTestId("button-withdraw-submit")).toBeDisabled();

  // A wildly-too-large amount is blocked in the UI when the ceiling is
  // known (the server re-checks regardless, below).
  if (wallet.body.transferableUsdc != null) {
    await page
      .getByTestId("input-withdraw-address")
      .fill("0x000000000000000000000000000000000000dEaD");
    await page.getByTestId("input-withdraw-amount").fill("9999999");
    await expect(page.getByTestId("button-withdraw-submit")).toBeDisabled();
  }

  // ---- Withdraw route: server-side rules through the real session ----
  // Too small:
  const tooSmall = await postJson(page, "/api/users/me/wallet/withdraw", {
    toAddress: "0x000000000000000000000000000000000000dEaD",
    amountUsdc: "0.001",
  });
  expect(tooSmall.status).toBe(400);
  expect(tooSmall.body.error).toContain("smallest withdrawal");

  // Garbage address:
  const badAddress = await postJson(page, "/api/users/me/wallet/withdraw", {
    toAddress: "0x1234",
    amountUsdc: "0.01",
  });
  expect(badAddress.status).toBe(400);
  expect(badAddress.body.error).toContain("not a valid wallet address");

  // The wallet's own address:
  const toSelf = await postJson(page, "/api/users/me/wallet/withdraw", {
    toAddress: address,
    amountUsdc: "0.01",
  });
  expect(toSelf.status).toBe(400);
  expect(toSelf.body.error).toContain("own address");

  // More than any test balance: the server refuses (insufficient after the
  // gas reserve - or chain-unreachable if the RPC is down; both are 409s
  // with an honest message and neither moves money).
  const absurd = await postJson(page, "/api/users/me/wallet/withdraw", {
    toAddress: "0x000000000000000000000000000000000000dEaD",
    amountUsdc: "9999999",
  });
  expect(absurd.status).toBe(409);
  expect(absurd.body.error).toMatch(/network fee|cannot be reached/);

  // ---- Log out from the menu ----
  await page.keyboard.press("Escape"); // close the dialog
  await page.getByTestId("button-wallet-menu").click();
  await page.getByTestId("button-menu-logout").click();
  await expect(page.getByTestId("button-wallet-menu")).toHaveCount(0, {
    timeout: 20_000,
  });
});
