import { expect, test } from "@playwright/test";
import {
  apiGetJson,
  mintSignInToken,
  requiredPersonaId,
  signIn,
} from "./helpers";

const TEST_USER_ID = requiredPersonaId("WALLET_MENU_TEST_USER_ID");

test("private usdc page renders correctly, shows real balance, and keeps controls disabled", async ({ page }) => {
  const token = await mintSignInToken(TEST_USER_ID);
  await signIn(page, token);
  await page.goto("/private-usdc");

  // Route protection
  await expect(page).toHaveURL(/\/private-usdc/);

  // Check copy exists
  await expect(page.getByText(/Arc confidential transfers are not available yet/i)).toBeVisible();

  // Read wallet to know what to expect
  const wallet = await apiGetJson(page, "/api/users/me/wallet");
  expect(wallet.status).toBe(200);

  // Check real balance rendering
  const balanceText = page.getByTestId("text-public-balance");
  await expect(balanceText).toBeVisible({ timeout: 20_000 });
  if (wallet.body.balanceUsdc != null) {
    await expect(balanceText).toHaveText(`${wallet.body.balanceUsdc} USDC`);
  } else {
    await expect(balanceText).toHaveText("Unavailable");
  }

  // Check disabled controls
  await expect(page.getByTestId("input-shield-amount")).toBeDisabled();
  await expect(page.getByTestId("button-shield-submit")).toBeDisabled();
  await expect(page.getByTestId("button-pay-private")).toBeDisabled();
  
  // Verify it contains "Soon"
  await expect(page.getByTestId("button-shield-submit")).toContainText(/Soon/i);
  await expect(page.getByTestId("button-pay-private")).toContainText(/Soon/i);
});
