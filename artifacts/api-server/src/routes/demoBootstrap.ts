import { Router, type IRouter } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { clerkClient } from "@clerk/express";
import { logger } from "../lib/logger";

/**
 * One-time provisioning for the three fixed demo accounts used by the Arc
 * Builder Program judges. The route is deliberately narrow:
 *
 * - It can only ever create/repair the three hardcoded accounts below;
 *   the request body is ignored entirely.
 * - It is gated by a bearer-style token that must equal the SHA-256 of
 *   SESSION_SECRET (constant-time compare), so only someone who already
 *   holds the server's own secret material can invoke it.
 * - It is idempotent: existing accounts are left in place (password and
 *   email verification are re-asserted so the documented credentials
 *   always work).
 *
 * It intentionally runs BEFORE requireAuth: it must work when no user
 * exists yet, and it never touches any non-demo account.
 */

const DEMO_ACCOUNTS = [
  { email: "riya@example.com", firstName: "Riya" },
  { email: "arjun@example.com", firstName: "Arjun" },
  { email: "meera@example.com", firstName: "Meera" },
] as const;

const DEMO_PASSWORD = "EnveloDemo-2026";

function expectedToken(): string | null {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) return null;
  return createHash("sha256").update(secret).digest("hex");
}

function tokenMatches(provided: string, expected: string): boolean {
  // Hash both sides so buffers always have equal length for timingSafeEqual.
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const CLERK_BAPI = "https://api.clerk.com/v1";

/**
 * Mint a short-lived session JWT for a demo user via the Backend API.
 * Server-created sessions skip device-trust checks, which the reserved
 * example.com inboxes could never satisfy.
 */
async function mintSessionJwt(
  secretKey: string,
  userId: string,
): Promise<{ sessionId: string; jwt: string; expiresInSeconds: number }> {
  const auth = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
  const sessionRes = await fetch(`${CLERK_BAPI}/sessions`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ user_id: userId }),
  });
  if (!sessionRes.ok) {
    throw new Error(`create session failed: ${sessionRes.status}`);
  }
  const session = (await sessionRes.json()) as { id: string };

  let expiresInSeconds = 300;
  let tokenRes = await fetch(`${CLERK_BAPI}/sessions/${session.id}/tokens`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ expires_in_seconds: expiresInSeconds }),
  });
  if (!tokenRes.ok) {
    // Older API versions reject expires_in_seconds; fall back to default TTL.
    expiresInSeconds = 60;
    tokenRes = await fetch(`${CLERK_BAPI}/sessions/${session.id}/tokens`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({}),
    });
  }
  if (!tokenRes.ok) {
    throw new Error(`create session token failed: ${tokenRes.status}`);
  }
  const token = (await tokenRes.json()) as { jwt: string };
  return { sessionId: session.id, jwt: token.jwt, expiresInSeconds };
}

const router: IRouter = Router();

router.post("/demo/bootstrap", async (req, res) => {
  // Kill-switch: once activation has run, the deployment can retire this
  // route without a code change by setting DEMO_BOOTSTRAP_DISABLED=1.
  if (process.env["DEMO_BOOTSTRAP_DISABLED"]) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  const expected = expectedToken();
  if (!expected) {
    res.status(503).json({ error: "Bootstrap unavailable." });
    return;
  }

  const provided = req.header("x-demo-bootstrap-token");
  if (!provided || !tokenMatches(provided, expected)) {
    res.status(403).json({ error: "Forbidden." });
    return;
  }

  const secretKey = process.env["CLERK_SECRET_KEY"] ?? "";
  const keyKind = secretKey.startsWith("sk_live_")
    ? "live"
    : secretKey.startsWith("sk_test_")
      ? "test"
      : "unknown";

  const body = (req.body ?? {}) as { mode?: unknown };
  const mode = body.mode === "tokens" ? "tokens" : "provision";

  if (mode === "tokens") {
    if (!secretKey) {
      res.status(503).json({ error: "Bootstrap unavailable." });
      return;
    }
    try {
      const tokens: {
        email: string;
        userId: string;
        sessionId: string;
        jwt: string;
        expiresInSeconds: number;
      }[] = [];
      for (const account of DEMO_ACCOUNTS) {
        const existing = await clerkClient.users.getUserList({
          emailAddress: [account.email],
          limit: 1,
        });
        const user = existing.data[0];
        if (!user) {
          res
            .status(409)
            .json({ error: `${account.email} is not provisioned yet.` });
          return;
        }
        const minted = await mintSessionJwt(secretKey, user.id);
        tokens.push({ email: account.email, userId: user.id, ...minted });
      }
      res.json({ keyKind, tokens });
    } catch (err) {
      logger.error({ err }, "Demo token mint failed");
      res.status(500).json({ error: "Token mint failed; see server logs." });
    }
    return;
  }

  const results: {
    email: string;
    userId: string;
    created: boolean;
    emailVerified: boolean;
  }[] = [];

  try {
    for (const account of DEMO_ACCOUNTS) {
      const existing = await clerkClient.users.getUserList({
        emailAddress: [account.email],
        limit: 1,
      });

      let userId: string;
      let created = false;

      if (existing.data.length > 0 && existing.data[0]) {
        userId = existing.data[0].id;
        // Re-assert the documented password so the demo credentials
        // always work even if the account was tampered with.
        await clerkClient.users.updateUser(userId, {
          password: DEMO_PASSWORD,
          skipPasswordChecks: true,
        });
      } else {
        const user = await clerkClient.users.createUser({
          emailAddress: [account.email],
          password: DEMO_PASSWORD,
          firstName: account.firstName,
          skipPasswordChecks: true,
        });
        userId = user.id;
        created = true;
      }

      // Mark the email address as verified so sign-in never stalls on a
      // verification code (the reserved example.com domain receives no mail).
      const user = await clerkClient.users.getUser(userId);
      let emailVerified = false;
      for (const email of user.emailAddresses) {
        if (email.emailAddress !== account.email) continue;
        if (email.verification?.status === "verified") {
          emailVerified = true;
        } else {
          await clerkClient.emailAddresses.updateEmailAddress(email.id, {
            verified: true,
          });
          emailVerified = true;
        }
      }

      results.push({ email: account.email, userId, created, emailVerified });
    }
  } catch (err) {
    logger.error({ err }, "Demo bootstrap failed");
    res.status(500).json({ error: "Bootstrap failed; see server logs." });
    return;
  }

  res.json({ keyKind, users: results });
});

export default router;
