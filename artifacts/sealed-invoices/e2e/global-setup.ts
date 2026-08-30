import {
  chromium,
  type Browser,
  type FullConfig,
  type LaunchOptions,
} from "@playwright/test";
import pg from "pg";
import { mintSignInToken, signIn } from "./helpers";

type Persona = {
  role: string;
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
  envKeys: string[];
  isTestPersona: boolean;
  minimumBalanceUsdc: number;
};

type ClerkUser = {
  id: string;
  external_id: string | null;
  public_metadata: Record<string, unknown>;
  email_addresses: Array<{ email_address: string }>;
};

const personas: Persona[] = [
  {
    role: "ava",
    externalId: "envelo-e2e-ava",
    firstName: "Ava",
    lastName: "Auditor",
    email: "ava.auditor+clerk_test@example.com",
    envKeys: ["WALLET_MENU_TEST_USER_ID", "GATING_TEST_USER_ID"],
    isTestPersona: true,
    minimumBalanceUsdc: 0.06,
  },
  {
    role: "signe",
    externalId: "envelo-e2e-signe",
    firstName: "Signe",
    lastName: "Sender",
    email: "signe.sender+clerk_test@example.com",
    envKeys: ["LOSTKEY_SENDER_ID"],
    isTestPersona: false,
    minimumBalanceUsdc: 1,
  },
  {
    role: "riko",
    externalId: "envelo-e2e-riko",
    firstName: "Riko",
    lastName: "Resetter",
    email: "riko.resetter+clerk_test@example.com",
    envKeys: ["LOSTKEY_RESETTER_ID"],
    isTestPersona: false,
    minimumBalanceUsdc: 0,
  },
  {
    role: "sela",
    externalId: "envelo-e2e-sela",
    firstName: "Sela",
    lastName: "Sealer",
    email: "sela.sealer+clerk_test@example.com",
    envKeys: ["SEAL_SENDER_ID"],
    isTestPersona: true,
    minimumBalanceUsdc: 1,
  },
  {
    role: "vera",
    externalId: "envelo-e2e-vera",
    firstName: "Vera",
    lastName: "Viewer",
    email: "vera.viewer+clerk_test@example.com",
    envKeys: ["GRANT_VIEWER_ID"],
    isTestPersona: true,
    minimumBalanceUsdc: 0,
  },
];

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not in the environment - run the browser checks inside the Replit workspace shell.`,
    );
  }
  return value;
}

async function clerkRequest<T>(
  secret: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
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
}

async function ensureClerkUser(
  secret: string,
  persona: Persona,
  existingUsers: ClerkUser[],
): Promise<ClerkUser> {
  let user = existingUsers.find(
    (candidate) =>
      candidate.external_id === persona.externalId ||
      candidate.public_metadata?.enveloE2eRole === persona.role ||
      candidate.email_addresses.some(
        (email) => email.email_address === persona.email,
      ),
  );

  if (!user) {
    user = await clerkRequest<ClerkUser>(secret, "/users", {
      method: "POST",
      body: JSON.stringify({
        email_address: [persona.email],
        first_name: persona.firstName,
        last_name: persona.lastName,
        external_id: persona.externalId,
        public_metadata: { enveloE2eRole: persona.role },
        skip_password_checks: true,
        skip_password_requirement: true,
      }),
    });
    existingUsers.push(user);
    return user;
  }

  user = await clerkRequest<ClerkUser>(secret, `/users/${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      first_name: persona.firstName,
      last_name: persona.lastName,
      external_id: persona.externalId,
    }),
  });
  return await clerkRequest<ClerkUser>(secret, `/users/${user.id}/metadata`, {
    method: "PATCH",
    body: JSON.stringify({
      public_metadata: {
        ...user.public_metadata,
        enveloE2eRole: persona.role,
      },
    }),
  });
}

async function syncThroughRealApp(
  browser: Browser,
  baseURL: string,
  userId: string,
): Promise<void> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  try {
    await signIn(page, await mintSignInToken(userId));
    await page.goto("/dashboard");
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const status = await page.evaluate(async () => {
        const response = await fetch("/api/users/me", {
          credentials: "include",
        });
        return response.status;
      });
      if (status === 200) return;
      await page.waitForTimeout(250);
    }
    throw new Error(`Timed out waiting for real-app sync for ${userId}.`);
  } finally {
    await context.close();
  }
}

async function arcBalance(address: string): Promise<number> {
  const response = await fetch("https://rpc.testnet.arc.io", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });
  const body = (await response.json()) as {
    result?: string;
    error?: { message?: string };
  };
  if (!response.ok || !body.result) {
    throw new Error(
      `Arc balance check failed for ${address}: ` +
        (body.error?.message ?? response.status),
    );
  }
  return Number(BigInt(body.result)) / 1e18;
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const clerkSecret = requiredEnvironment("CLERK_SECRET_KEY");
  const databaseUrl = requiredEnvironment("DATABASE_URL");
  const project = config.projects[0];
  const baseURL = project?.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("Playwright baseURL is required for real-app fixture setup.");
  }

  const existingUsers = await clerkRequest<ClerkUser[]>(
    clerkSecret,
    "/users?limit=100",
  );
  const launchOptions = (project.use.launchOptions ?? {}) as LaunchOptions;
  const browser = await chromium.launch(launchOptions);
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const persona of personas) {
      const user = await ensureClerkUser(clerkSecret, persona, existingUsers);
      for (const envKey of persona.envKeys) process.env[envKey] = user.id;

      await syncThroughRealApp(browser, baseURL, user.id);
      const displayName = `${persona.firstName} ${persona.lastName}`;
      const profile = await client.query(
        `UPDATE users
         SET display_name = $2, email = $3, is_test_persona = $4
         WHERE id = $1
         RETURNING id`,
        [user.id, displayName, persona.email, persona.isTestPersona],
      );
      if (profile.rowCount !== 1) {
        throw new Error(`Real-app sync did not create the ${displayName} profile.`);
      }
    }

    if (!process.env.SKIP_ARC_TESTNET_FUNDING_CHECK) {
      const fundingProblems: string[] = [];
      for (const persona of personas) {
        if (persona.minimumBalanceUsdc === 0) continue;
        const userId = process.env[persona.envKeys[0]]!;
        const wallet = await client.query(
          "SELECT address FROM chain_wallets WHERE id = $1",
          [userId],
        );
        const address: string | undefined = wallet.rows[0]?.address;
        if (!address) {
          throw new Error(`The ${persona.firstName} fixture has no managed wallet.`);
        }
        const balance = await arcBalance(address);
        if (balance < persona.minimumBalanceUsdc) {
          fundingProblems.push(
            `${persona.firstName} needs at least ${persona.minimumBalanceUsdc} test USDC ` +
              `at ${address}, but has ${balance.toFixed(6)}.`,
          );
        }
      }
      if (fundingProblems.length > 0) {
        throw new Error(
          "Dedicated browser fixtures need Arc testnet funding:\n" +
            fundingProblems.join("\n") +
            "\nUse https://faucet.circle.com on Arc Testnet, then rerun the same command.",
        );
      }
    }
  } finally {
    await client.end();
    await browser.close();
  }
}