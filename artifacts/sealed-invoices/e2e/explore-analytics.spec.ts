import { expect, test, type Page } from "@playwright/test";
import { mintSignInToken, signIn } from "./helpers";

const TEST_USER_ID =
  process.env.WALLET_MENU_TEST_USER_ID ??
  "user_3IXZ7cQKd4sccYTDtW8gk7N9ZJA";

type CapturedEvent = {
  name: string;
  data?: Record<string, string | number | boolean>;
};

async function installAnalyticsRecorder(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const testWindow = window as typeof window & {
      __analyticsEvents?: CapturedEvent[];
    };
    testWindow.__analyticsEvents = [];
    window.umami = {
      track(name, data) {
        testWindow.__analyticsEvents?.push({ name, data });
      },
    };
  });
}

async function capturedEvents(page: Page): Promise<CapturedEvent[]> {
  return page.evaluate(
    () =>
      (
        window as typeof window & {
          __analyticsEvents?: CapturedEvent[];
        }
      ).__analyticsEvents ?? [],
  );
}

test("Explore records privacy-safe signed-out conversion actions", async ({
  page,
}) => {
  await installAnalyticsRecorder(page);

  await page.goto("/");
  await page.getByTestId("button-hero-signup").click();
  await expect(page).toHaveURL(/\/sign-up$/);
  expect(await capturedEvents(page)).toEqual([
    {
      name: "explore_cta_clicked",
      data: { location: "hero", action: "sign_up" },
    },
  ]);

  await page.goto("/explore");
  await page.getByTestId("button-hero-signin").click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(await capturedEvents(page)).toEqual([
    {
      name: "explore_cta_clicked",
      data: { location: "hero", action: "sign_in" },
    },
  ]);

  await page.goto("/explore");
  await page.getByTestId("button-cta-signup").click();
  await expect(page).toHaveURL(/\/sign-up$/);
  expect(await capturedEvents(page)).toEqual([
    {
      name: "explore_cta_clicked",
      data: { location: "final", action: "sign_up" },
    },
  ]);

  await page.goto("/explore");
  await page.getByTestId("button-cta-signin").click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(await capturedEvents(page)).toEqual([
    {
      name: "explore_cta_clicked",
      data: { location: "final", action: "sign_in" },
    },
  ]);

  await page.goto("/explore");
  const demoPopup = page.waitForEvent("popup");
  await page.getByTestId("link-demo-new-tab").click();
  await (await demoPopup).close();
  expect(await capturedEvents(page)).toEqual([
    {
      name: "explore_demo_opened",
      data: { location: "demo_section", action: "new_tab" },
    },
  ]);

  await page.goto("/explore");
  const footerPopup = page.waitForEvent("popup");
  await page.getByTestId("link-footer-demo").click();
  await (await footerPopup).close();
  expect(await capturedEvents(page)).toEqual([
    {
      name: "explore_demo_opened",
      data: { location: "footer", action: "new_tab" },
    },
  ]);
});

test("Explore records authenticated dashboard returns", async ({ page }) => {
  await installAnalyticsRecorder(page);
  const token = await mintSignInToken(TEST_USER_ID);
  await signIn(page, token);

  await page.goto("/explore");
  await page.getByTestId("button-hero-dashboard").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await capturedEvents(page)).toEqual([
    {
      name: "explore_cta_clicked",
      data: { location: "hero", action: "open_dashboard" },
    },
  ]);

  await page.goto("/explore");
  await page.getByTestId("button-cta-dashboard").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await capturedEvents(page)).toEqual([
    {
      name: "explore_cta_clicked",
      data: { location: "final", action: "open_dashboard" },
    },
  ]);
});

test("analytics absence or failure never blocks Explore navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("button-hero-signup").click();
  await expect(page).toHaveURL(/\/sign-up$/);

  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/");
  await page.evaluate(() => {
    window.umami = {
      track() {
        throw new Error("analytics transport unavailable");
      },
    };
  });
  await page.getByTestId("button-hero-signin").click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(pageErrors).toEqual([]);
});