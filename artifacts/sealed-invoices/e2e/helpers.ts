import { expect, type Page } from "@playwright/test";
import pg from "pg";

// Shared plumbing for the browser-level regression specs. Everything here
// drives the REAL app against the REAL API and database - no mocks.

/** localStorage keys holding a user's envelope keypair (must match src/lib/crypto.ts). */
export const storageKeys = (userId: string) => [
  `sealed-invoices:privkey:${userId}`,
  `sealed-invoices:pubkey:${userId}`,
];

/** Mint a single-use Clerk sign-in token server-side (Backend API). */
export async function mintSignInToken(userId: string): Promise<string> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "CLERK_SECRET_KEY is not in the environment - run this inside the Replit workspace shell.",
    );
  }
  const res = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 600 }),
  });
  if (!res.ok) {
    throw new Error(`Minting a sign-in token failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { token: string };
  return body.token;
}

type ClerkTestUser = {
  id: string;
  external_id: string | null;
  email_addresses: Array<{ email_address: string }>;
};

export async function ensureClerkTestUser(fixture: {
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
}): Promise<string> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "CLERK_SECRET_KEY is not in the environment - run this inside the Replit workspace shell.",
    );
  }

  const request = async <T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> => {
    const response = await fetch(`https://api.clerk.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Clerk fixture request ${init?.method ?? "GET"} ${path} failed: ` +
          `${response.status} ${await response.text()}`,
      );
    }
    return (await response.json()) as T;
  };

  const users = await request<ClerkTestUser[]>("/users?limit=100");
  let user = users.find(
    (candidate) =>
      candidate.external_id === fixture.externalId ||
      candidate.email_addresses.some(
        ({ email_address }) => email_address === fixture.email,
      ),
  );
  if (!user) {
    user = await request<ClerkTestUser>("/users", {
      method: "POST",
      body: JSON.stringify({
        email_address: [fixture.email],
        first_name: fixture.firstName,
        last_name: fixture.lastName,
        external_id: fixture.externalId,
        skip_password_checks: true,
        skip_password_requirement: true,
      }),
    });
  }
  return user.id;
}

export function requiredPersonaId(environmentName: string): string {
  const userId = process.env[environmentName];
  if (!userId) {
    throw new Error(
      `${environmentName} was not provisioned by the Playwright global setup.`,
    );
  }
  return userId;
}

/** Sign the browser session in via the ticket strategy (see .agents/memory/clerk-e2e-signin.md). */
export async function signIn(page: Page, token: string): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as any).Clerk?.loaded, undefined, {
    timeout: 30_000,
  });
  await page.evaluate(async (ticket) => {
    const clerk = (window as any).Clerk;
    const attempt = await clerk.client.signIn.create({ strategy: "ticket", ticket });
    await clerk.setActive({ session: attempt.createdSessionId });
  }, token);
}

/**
 * With a Restore dialog open, take the no-backup escape hatch and complete
 * the reset: type the confirmation word, submit, and wait for the dialog to
 * close (it only closes on success; failures render inline and would keep
 * the input mounted, failing this wait loudly).
 */
export async function resetThroughDialogs(page: Page): Promise<void> {
  await page.getByTestId("button-lost-backup").click();
  await page.getByTestId("input-reset-confirm").fill("RESET");
  await page.getByTestId("button-reset-key").click();
  await expect(page.getByTestId("input-reset-confirm")).toHaveCount(0, {
    timeout: 30_000,
  });
}

/**
 * Make this fresh browser context able to open envelopes, whatever state the
 * persona is in. First ever run: sign-in just generated a key (ready).
 * Every later run: the key from the previous context is gone, so go through
 * the lost-key reset flow.
 */
export async function ensureReadyKey(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await expect(page.getByTestId("card-envelope-key")).toBeVisible({ timeout: 30_000 });
  // 'checking' renders a skeleton; wait until either state's button shows.
  const anyKeyButton = page
    .locator('[data-testid="button-backup-key"], [data-testid="button-restore-key"]')
    .first();
  await expect(anyKeyButton).toBeVisible({ timeout: 30_000 });
  if (await page.getByTestId("button-backup-key").isVisible().catch(() => false)) {
    return; // ready
  }
  await page.getByTestId("button-restore-key").click();
  await resetThroughDialogs(page);
  await expect(page.getByTestId("button-backup-key")).toBeVisible({ timeout: 30_000 });
}

/**
 * Seal a real invoice through the real UI; returns the new invoice's id and
 * number. The client field is a lookup, not a dropdown: type the client's
 * email, press Find, and only the resolved card unlocks sealing.
 */
export async function createInvoice(
  page: Page,
  recipient: { id: string; name: string },
  opts: { numberPrefix: string; title: string; description: string; amountUsdc?: string },
): Promise<{ id: string; invoiceNumber: string }> {
  const invoiceNumber = `${opts.numberPrefix}-${Date.now().toString().slice(-6)}`;
  const email = await emailOf(recipient.id);
  await page.goto("/invoices/new");
  await page.getByLabel("Invoice Number").fill(invoiceNumber);
  await page.getByTestId("input-client-query").fill(email);
  await page.getByTestId("button-client-lookup").click();
  await expect(page.getByTestId("text-client-resolved")).toContainText(recipient.name, {
    timeout: 15_000,
  });
  await page.getByLabel("Project / Title").fill(opts.title);
  await page.getByLabel("Line Item Description").fill(opts.description);
  await page.getByLabel("Amount (USDC)").fill(opts.amountUsdc ?? "0.01");
  await page.getByRole("button", { name: /Seal & Send/ }).click();

  // The wallet-style approval sheet must appear BEFORE anything is sealed,
  // showing the real contract and network. Cancel must close it without
  // creating anything; only Confirm proceeds.
  const approveSheet = page.getByTestId("dialog-anchor-approve");
  await expect(approveSheet).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("text-anchor-network")).toContainText("Arc Testnet");
  await expect(page.getByTestId("text-anchor-contract")).toContainText(/0x/);
  await expect(page.getByTestId("text-anchor-fee")).toBeVisible();
  await page.getByTestId("button-anchor-cancel").click();
  await expect(approveSheet).not.toBeVisible();
  await page.getByRole("button", { name: /Seal & Send/ }).click();
  await expect(approveSheet).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("button-anchor-confirm").click();
  // Wait for navigation OR the page's inline failure notice. Waiting only
  // for the URL burns the whole timeout in silence and leaves no evidence
  // of what actually went wrong.
  const inlineError = page.getByTestId("text-seal-error");
  const failure = await Promise.race([
    page.waitForURL(/\/invoices\/[0-9a-f-]{36}/, { timeout: 45_000 }).then(
      () => null as string | null,
      () => "Seal & Send neither navigated nor showed an error within 45s",
    ),
    // Slightly longer timeout so the navigation-timeout message above wins
    // the race when NOTHING happened; on success this waiter quietly lapses.
    inlineError.waitFor({ state: "visible", timeout: 47_000 }).then(
      async () =>
        `Seal & Send failed in-app: ${(await inlineError.textContent()) ?? "(no message)"}`,
      () => null as string | null,
    ),
  ]);
  if (failure) throw new Error(failure);
  const match = page.url().match(/invoices\/([0-9a-f-]{36})/);
  if (!match) throw new Error(`No invoice id in URL: ${page.url()}`);
  return { id: match[1], invoiceNumber };
}

/** The envelope endpoint's verdict through the browser's own session. */
export async function envelopeStatus(page: Page, invoiceId: string): Promise<number> {
  return await page.evaluate(async (id) => {
    const res = await fetch(`/api/invoices/${id}/envelope`, { credentials: "include" });
    return res.status;
  }, invoiceId);
}

/**
 * One SQL statement against the app's REAL database - the same one the API
 * server uses. Reserved for state the product deliberately has no API for:
 * the is_test_persona directory flag, and time-warping a grant's expiry
 * (no spec can wait 24 real hours). Returns the affected row count.
 */
async function dbQuery(
  sql: string,
  params: unknown[],
): Promise<{ rows: any[]; rowCount: number }> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not in the environment - run this inside the Replit workspace shell.",
    );
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } finally {
    await client.end();
  }
}

async function dbExecute(sql: string, params: unknown[]): Promise<number> {
  return (await dbQuery(sql, params)).rowCount;
}

/** Reset a dedicated Clerk fixture to the pre-first-sync app state. */
export async function resetUnsyncedTestPersona(userId: string): Promise<void> {
  await dbExecute("DELETE FROM chain_wallets WHERE id = $1", [userId]);
  await dbExecute("DELETE FROM users WHERE id = $1", [userId]);
}

/**
 * Ground-truth reads for values the product's API deliberately hides from
 * OTHER users (emails and wallet addresses stay private between accounts).
 * Specs need them to drive the real client-lookup field the way a human
 * would: typing the value the counterparty shared out of band.
 */
export async function emailOf(userId: string): Promise<string> {
  const { rows } = await dbQuery("SELECT email FROM users WHERE id = $1", [userId]);
  const email: string | null = rows[0]?.email ?? null;
  if (!email) {
    throw new Error(
      `Persona ${userId} has no users row or no email - the client-lookup flow needs one.`,
    );
  }
  return email;
}

export async function custodialAddressOf(userId: string): Promise<string> {
  const { rows } = await dbQuery("SELECT address FROM chain_wallets WHERE id = $1", [
    userId,
  ]);
  const address: string | null = rows[0]?.address ?? null;
  if (!address) {
    throw new Error(
      `Persona ${userId} has no custodial wallet row yet (created on first sign-in).`,
    );
  }
  return address;
}

/**
 * Flip a persona's is_test_persona flag. Flagged personas are hidden from
 * GET /api/users, so the REAL client/grant pickers cannot list them. A spec
 * whose persona must be pickable unflags it for exactly the picker steps
 * and restores the flag in its finally block - steady state stays flagged,
 * so demo pickers remain clean between runs. Throws if the persona has no
 * users row yet (the row appears on its first sign-in).
 */
export async function setTestPersonaFlag(
  userId: string,
  flagged: boolean,
): Promise<void> {
  const updated = await dbExecute(
    "UPDATE users SET is_test_persona = $2 WHERE id = $1",
    [userId, flagged],
  );
  if (updated !== 1) {
    throw new Error(
      `Setting is_test_persona=${flagged} for ${userId} touched ${updated} rows - ` +
        "the persona has no users row yet (it is created by the first sign-in).",
    );
  }
}

/**
 * Time-warp a grant's expiry into the past - the exact persistent state 24
 * real hours would produce, without the wait. Not a mock: every read after
 * this goes through the real API against this real row.
 */
export async function expireGrantNow(grantId: string): Promise<void> {
  const updated = await dbExecute(
    "UPDATE grants SET expires_at = NOW() - INTERVAL '1 second' WHERE id = $1",
    [grantId],
  );
  if (updated !== 1) {
    throw new Error(`Expiring grant ${grantId} touched ${updated} rows - wrong id?`);
  }
}

/**
 * A FRESH API read through the browser's own session - the yardstick every
 * UI claim is compared against. Never reuses react-query caches.
 */
export async function apiGetJson(
  page: Page,
  path: string,
): Promise<{ status: number; body: any }> {
  return await page.evaluate(async (p) => {
    const res = await fetch(p, { credentials: "include" });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON response: body stays null, status still tells the story
    }
    return { status: res.status, body };
  }, path);
}
