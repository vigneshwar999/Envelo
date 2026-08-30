import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  ensureClerkTestUser,
  mintSignInToken,
  resetUnsyncedTestPersona,
  signIn,
} from "./helpers";

const baseURL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "http://localhost:80";

type CapturedEvent = {
  name: string;
  data?: Record<string, string | number | boolean>;
};

let completionUserId: string;
let safetyUserId: string;

test.beforeAll(async () => {
  [completionUserId, safetyUserId] = await Promise.all([
    ensureClerkTestUser({
      externalId: "envelo-e2e-signup-completion",
      firstName: "Kaia",
      lastName: "Conversion",
      email: "kaia.conversion+clerk_test@example.com",
    }),
    ensureClerkTestUser({
      externalId: "envelo-e2e-signup-safety",
      firstName: "Niko",
      lastName: "Safety",
      email: "niko.safety+clerk_test@example.com",
    }),
  ]);
});

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

async function syncResponse(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/users/me/sync",
  );
}

async function expectReadyAccount(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await expect(page.getByTestId("card-envelope-key")).toBeVisible({
    timeout: 30_000,
  });
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const response = await fetch("/api/users/me", {
            credentials: "include",
          });
          return response.status;
        }),
      { timeout: 30_000 },
    )
    .toBe(200);
}

async function openSignedOutPage(browser: Browser): Promise<{
  context: Awaited<ReturnType<Browser["newContext"]>>;
  page: Page;
}> {
  const context = await browser.newContext({ baseURL });
  return { context, page: await context.newPage() };
}

test("an Explore signup click becomes one completed-account event", async ({
  browser,
}) => {
  const userId = completionUserId;
  await resetUnsyncedTestPersona(userId);

  const first = await openSignedOutPage(browser);
  try {
    await installAnalyticsRecorder(first.page);
    await first.page.goto("/explore");
    await first.page.getByTestId("button-hero-signup").click();
    expect(await capturedEvents(first.page)).toEqual([
      {
        name: "explore_cta_clicked",
        data: { location: "hero", action: "sign_up" },
      },
    ]);

    const firstSync = syncResponse(first.page);
    await signIn(first.page, await mintSignInToken(userId));
    const firstBody = (await (await firstSync).json()) as { created: boolean };
    expect(firstBody.created).toBe(true);
    await expect
      .poll(() => capturedEvents(first.page), { timeout: 30_000 })
      .toEqual([
        {
          name: "explore_signup_completed",
          data: { location: "hero" },
        },
      ]);
    await expectReadyAccount(first.page);
  } finally {
    await first.context.close();
  }

  const returning = await openSignedOutPage(browser);
  try {
    await installAnalyticsRecorder(returning.page);
    await returning.page.goto("/explore");
    await returning.page.getByTestId("button-cta-signup").click();

    const returningSync = syncResponse(returning.page);
    await signIn(returning.page, await mintSignInToken(userId));
    const returningBody = (await (await returningSync).json()) as {
      created: boolean;
    };
    expect(returningBody.created).toBe(false);
    await expectReadyAccount(returning.page);
    expect(await capturedEvents(returning.page)).toEqual([]);
  } finally {
    await returning.context.close();
    await resetUnsyncedTestPersona(userId);
  }
});

test("missing or throwing analytics never blocks first account setup", async ({
  browser,
}) => {
  const userId = safetyUserId;

  for (const analyticsMode of ["absent", "throwing"] as const) {
    await resetUnsyncedTestPersona(userId);
    const current = await openSignedOutPage(browser);
    const pageErrors: Error[] = [];
    current.page.on("pageerror", (error) => pageErrors.push(error));

    try {
      if (analyticsMode === "throwing") {
        await current.page.addInitScript(() => {
          window.umami = {
            track() {
              throw new Error("analytics transport unavailable");
            },
          };
        });
      }

      await current.page.goto("/explore");
      await current.page.getByTestId("button-hero-signup").click();
      const pendingSync = syncResponse(current.page);
      await signIn(current.page, await mintSignInToken(userId));
      const body = (await (await pendingSync).json()) as { created: boolean };
      expect(body.created).toBe(true);
      await expectReadyAccount(current.page);
      expect(pageErrors).toEqual([]);
    } finally {
      await current.context.close();
    }
  }

  await resetUnsyncedTestPersona(userId);
});