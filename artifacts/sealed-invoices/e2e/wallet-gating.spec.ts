import { expect, test, type Page } from "@playwright/test";
import {
  custodialAddressOf,
  mintSignInToken,
  requiredPersonaId,
  signIn,
} from "./helpers";

// Regression check for the class of bug where UI gating disagrees with the
// API: the "Move my balance" button once silently failed to appear because
// the page kept showing stale wallet data after linking a payout wallet
// (only the profile query was refreshed; canTransfer lives in the wallet
// query). Typechecks cannot see that. This test drives the real app against
// the real API and asserts, at every step, that the button's visibility
// agrees with a FRESH read of GET /api/users/me/wallet.
//
// Dedicated test account: Ava Auditor. No other flow pays from her
// app-managed wallet, and this test never clicks the transfer button, so her
// balance is stable. That balance is a hard PRECONDITION, not a nice-to-have:
// the stale-query bug is only observable when canTransfer flips to true
// after linking, so if the account ever drops below the transferable
// minimum this test FAILS with instructions instead of passing vacuously.
//
// The account always ends unlinked: the flow unlinks through the UI, and a
// finally block additionally unlinks through the API even if an assertion
// fails halfway.

const TEST_USER_ID = requiredPersonaId("GATING_TEST_USER_ID");

// Server rule: canTransfer requires a linked payout address AND
// transferable >= 0.01 USDC, where transferable = balance - 0.05 gas
// reserve. So the account must hold >= 0.06 USDC; we check the transferable
// number the API itself reports.
const MIN_TRANSFERABLE_USDC = 0.01;

// The well-known burn address - valid to link, and this test never sends to
// it. Linking is a database write only; no chain transaction happens here.
const PAYOUT_ADDRESS = "0x000000000000000000000000000000000000dEaD";

type WalletResponse = {
  canTransfer: boolean;
  transferableUsdc: string | null;
};

/**
 * A fresh wallet read through the browser's own session - the exact truth
 * the UI is supposed to reflect at this moment.
 */
async function fetchWalletFresh(page: Page): Promise<WalletResponse> {
  return await page.evaluate(async () => {
    const res = await fetch("/api/users/me/wallet", { credentials: "include" });
    if (!res.ok) {
      throw new Error(`GET /api/users/me/wallet -> ${res.status}`);
    }
    return (await res.json()) as any;
  });
}

/**
 * Teardown: unlink the payout wallet directly through the API, regardless of
 * what state the UI is in. Idempotent (unlinking twice is fine).
 */
async function unlinkViaApi(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const res = await fetch("/api/users/me/payout-address", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ address: null }),
    });
    if (!res.ok) {
      throw new Error(`teardown PUT /api/users/me/payout-address -> ${res.status}`);
    }
  });
}

/**
 * THE regression assertion: the button's visibility must agree with the
 * API's canTransfer. Playwright's auto-waiting expect gives in-flight
 * refetches a moment to land; a MISSING refetch (the original bug) never
 * converges and fails loudly here.
 */
async function expectGatingAgreement(
  page: Page,
  label: string,
): Promise<WalletResponse> {
  const wallet = await fetchWalletFresh(page);
  const button = page.getByTestId("button-transfer-balance");
  if (wallet.canTransfer) {
    await expect(
      button,
      `${label}: the API says canTransfer=true (transferable ${wallet.transferableUsdc} USDC), so the Move-balance button must be visible`,
    ).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(
      button,
      `${label}: the API says canTransfer=false, so the Move-balance button must not exist`,
    ).toHaveCount(0, { timeout: 15_000 });
  }
  return wallet;
}

test("Move-balance button visibility agrees with the API after linking and unlinking", async ({
  page,
}) => {
  const token = await mintSignInToken(TEST_USER_ID);
  await signIn(page, token);

  try {
    await page.goto("/wallet");
    await expect(page.getByTestId("card-own-wallet")).toBeVisible({
      timeout: 30_000,
    });

    // Defensive: if a previous run (or a human) left a wallet linked, start clean.
    const unlinkButton = page.getByTestId("button-unlink-payout");
    if (await unlinkButton.isVisible().catch(() => false)) {
      await unlinkButton.click();
      await expect(page.getByTestId("input-payout-address")).toBeVisible({
        timeout: 15_000,
      });
    }

    // 1. Unlinked: the API must say false and the button must be absent.
    const before = await expectGatingAgreement(page, "before linking");
    expect(before.canTransfer, "unlinked must never be transferable").toBe(false);
    const managedWallet = await custodialAddressOf(TEST_USER_ID);

    // PRECONDITION: the dedicated test account must have enough balance that
    // linking flips canTransfer to true - that is the only state in which
    // the historical stale-query bug is observable. Never pass vacuously.
    expect(
      Number(before.transferableUsdc ?? 0) >= MIN_TRANSFERABLE_USDC,
      `PRECONDITION FAILED: the dedicated test account's transferable balance is ` +
        `${before.transferableUsdc ?? "0"} USDC but this check needs >= ${MIN_TRANSFERABLE_USDC} ` +
        `to exercise the button-appears branch. Top up its app-managed wallet ` +
        `${managedWallet} (Arc testnet USDC) and re-run. Do NOT weaken this check.`,
    ).toBe(true);

    // 2. Link a payout wallet through the real UI.
    await page.getByTestId("input-payout-address").fill(PAYOUT_ADDRESS);
    await page.getByTestId("button-save-payout").click();
    await expect(page.getByTestId("text-linked-address")).toBeVisible({
      timeout: 15_000,
    });

    // 3. With the precondition enforced, the API MUST now say transferable...
    const after = await expectGatingAgreement(page, "after linking");
    expect(
      after.canTransfer,
      "funded + linked must be transferable (precondition guaranteed funds; linking just happened)",
    ).toBe(true);
    // ...and expectGatingAgreement above has already required the button to
    // be VISIBLE - exactly what the stale-query bug broke.

    // 4. Unlink through the real UI and re-check agreement: the button must
    //    disappear again (stale data would keep it visible).
    await page.getByTestId("button-unlink-payout").click();
    await expect(page.getByTestId("input-payout-address")).toBeVisible({
      timeout: 15_000,
    });
    const end = await expectGatingAgreement(page, "after unlinking");
    expect(end.canTransfer, "unlinked must never be transferable").toBe(false);
  } finally {
    // Guaranteed cleanup: whatever happened above, leave the shared demo
    // account unlinked so later runs (and humans) find it as documented.
    try {
      await unlinkViaApi(page);
    } catch (err) {
      console.warn(
        "Teardown could not unlink via API - the test account may be left linked:",
        err,
      );
    }
  }
});
