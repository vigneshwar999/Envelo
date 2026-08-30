import { expect, test } from "@playwright/test";
import { mintSignInToken, signIn } from "./helpers";

const TEST_USER_ID =
  process.env.WALLET_MENU_TEST_USER_ID ??
  "user_3IXZ7cQKd4sccYTDtW8gk7N9ZJA";

test("signed-out visitors can explore Envelo before authentication", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Private paperwork.*Public proof/i }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveTitle("Envelo");
  await expect(page.getByTestId("button-hero-signup")).toHaveAttribute(
    "href",
    "/sign-up",
  );
  await expect(page.getByTestId("button-hero-signin")).toHaveAttribute(
    "href",
    "/sign-in",
  );
  await expect(page.getByTestId("iframe-demo")).toHaveAttribute(
    "src",
    "/demo-video/",
  );
  await expect(page.getByTestId("link-demo-new-tab")).toHaveAttribute(
    "href",
    "/demo-video/",
  );

  await page.goto("/explore");
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByText("The Trust Boundary")).toBeVisible();
  await expect(page.getByText(/Chain ID 5042002/)).toBeVisible();
  await expect(page.getByText(/Shielded USDC is coming soon/i)).toBeVisible();
});

test("mobile visitors can reach public pages and authentication", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("button-mobile-menu")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByTestId("button-mobile-menu").click();

  await expect(page.getByTestId("link-mobile-explore")).toBeVisible();
  await expect(page.getByTestId("link-mobile-how-it-works")).toBeVisible();
  await expect(page.getByTestId("link-mobile-signin")).toHaveAttribute(
    "href",
    "/sign-in",
  );
  await expect(page.getByTestId("link-mobile-signup")).toHaveAttribute(
    "href",
    "/sign-up",
  );
});

test("signed-in users still land on the dashboard and can revisit Explore", async ({
  page,
}) => {
  const token = await mintSignInToken(TEST_USER_ID);
  await signIn(page, token);

  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });

  await page.goto("/explore");
  await expect(page).toHaveURL(/\/explore$/);
  await expect(
    page.getByRole("heading", { name: /Private paperwork.*Public proof/i }),
  ).toBeVisible();
  await expect(page.getByTestId("button-hero-dashboard")).toHaveAttribute(
    "href",
    "/dashboard",
  );
  await expect(page.getByTestId("button-hero-signup")).toHaveCount(0);
});