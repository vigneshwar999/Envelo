import { Router, type IRouter } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { clerkClient } from "@clerk/express";
import { eq, inArray, or } from "drizzle-orm";
import {
  db,
  chainWalletsTable,
  grantsTable,
  invoiceEventsTable,
  invoicesTable,
  pushTokensTable,
  reshareNotificationsTable,
  usersTable,
  walletTransfersTable,
  wrappedKeysTable,
} from "@workspace/db";
import type { Address } from "viem";
import { formatUsdc, sweepWalletBalance, type SweepResult } from "../chain/arc";
import { logger } from "../lib/logger";

/**
 * One-time removal of "ghost" accounts: users rows whose ids do NOT exist in
 * the Clerk tenant this server authenticates against. Such rows appear when
 * a database from one Clerk instance is copied into an environment wired to
 * another (the dev -> prod copy at first publish). Ghosts can never sign in
 * here, yet the recipient picker offers them, so invoices sent to them are
 * sealed for a key nobody can ever use - a black hole.
 *
 * Design mirrors demoBootstrap.ts, the established pattern for admin actions
 * that must run inside the deployment (only the deployment holds the live
 * Clerk secret key):
 *
 * - Token-gated: the caller must present the SHA-256 of SESSION_SECRET
 *   (constant-time compare), i.e. must already hold server secret material.
 * - Kill switch: set GHOST_CLEANUP_DISABLED=1 to retire the route without a
 *   code change.
 * - Dry-run by default: without `{"mode":"apply"}` in the body it only
 *   reports what WOULD be deleted. Nothing is written.
 * - Runs BEFORE requireAuth: it is not acting as any signed-in user.
 *
 * What apply does, per ghost user:
 * 1. Best-effort sweep of the ghost's custodial testnet wallet back to the
 *    operator wallet (funds are valueless test USDC; failure never blocks).
 * 2. In ONE transaction, delete every row that references the ghost -
 *    invoices either side (their events, grants, and wrapped keys first),
 *    grants granted by/to the ghost on surviving invoices, wallet transfer
 *    receipts, push tokens, re-share notifications, the custodial wallet
 *    row, and finally the users row itself.
 *
 * Rows with is_test_persona = true are NEVER touched: demo personas are
 * intentional local accounts and are already hidden from all pickers.
 *
 * NOTE: this module never selects chain_wallets.private_key. The sweep goes
 * through sweepWalletBalance, which handles key material internally.
 */

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

/** Every user id in the Clerk tenant this server's secret key belongs to. */
async function listAllClerkUserIds(): Promise<string[]> {
  const ids: string[] = [];
  const limit = 500;
  let offset = 0;
  for (;;) {
    const page = await clerkClient.users.getUserList({ limit, offset });
    for (const user of page.data) ids.push(user.id);
    if (page.data.length < limit) break;
    offset += limit;
    // This app's tenants hold a handful of users; a runaway loop means the
    // API is misbehaving, and guessing on partial data must not delete rows.
    if (offset > 10_000) {
      throw new Error("Clerk user list unexpectedly large - aborting");
    }
  }
  return ids;
}

/** A JSON-safe rendering of a sweep outcome (SweepResult carries bigints). */
function describeSweep(result: SweepResult): Record<string, string | boolean> {
  switch (true) {
    case result.ok:
      return {
        ok: true,
        txHash: result.txHash,
        amountUsdc: formatUsdc(result.amountWei),
      };
    default:
      switch (result.reason) {
        case "nothing_to_sweep":
          return {
            ok: false,
            reason: result.reason,
            balanceUsdc: formatUsdc(result.balanceWei),
          };
        case "insufficient":
          return {
            ok: false,
            reason: result.reason,
            balanceUsdc: formatUsdc(result.balanceWei),
            maxUsdc: formatUsdc(result.maxWei),
          };
        case "unconfirmed":
          return { ok: false, reason: result.reason, txHash: result.txHash };
        default:
          return { ok: false, reason: result.reason };
      }
  }
}

const router: IRouter = Router();

router.post("/admin/ghost-cleanup", async (req, res) => {
  // Kill switch: once the cleanup has run, the deployment can retire this
  // route without a code change by setting GHOST_CLEANUP_DISABLED=1.
  if (process.env["GHOST_CLEANUP_DISABLED"]) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  const expected = expectedToken();
  if (!expected) {
    res.status(503).json({ error: "Cleanup unavailable." });
    return;
  }

  const provided = req.header("x-ghost-cleanup-token");
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

  const body = (req.body ?? {}) as {
    mode?: unknown;
    sweep?: unknown;
    onlyUserIds?: unknown;
  };
  const mode = body.mode === "apply" ? "apply" : "dry-run";
  const sweepEnabled = body.sweep !== false;
  // Optional narrowing: when provided, only ghosts in this list are acted
  // on. Useful for a cautious first pass. It can only ever SHRINK the ghost
  // set - a listed id that does exist in Clerk is still not a ghost.
  const onlyUserIds = Array.isArray(body.onlyUserIds)
    ? body.onlyUserIds.filter((id): id is string => typeof id === "string")
    : null;

  try {
    const clerkUserIds = await listAllClerkUserIds();
    if (clerkUserIds.length === 0) {
      // An empty tenant almost certainly means a misconfigured key - and
      // treating it as truth would delete every account. Refuse.
      res.status(409).json({
        error:
          "The Clerk tenant reports zero users. Refusing to treat that as truth - check CLERK_SECRET_KEY.",
        keyKind,
      });
      return;
    }
    const clerkIdSet = new Set(clerkUserIds);

    const allDbUsers = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        email: usersTable.email,
        isTestPersona: usersTable.isTestPersona,
      })
      .from(usersTable);

    let ghosts = allDbUsers.filter(
      (u) => !u.isTestPersona && !clerkIdSet.has(u.id),
    );
    if (onlyUserIds) {
      const allow = new Set(onlyUserIds);
      ghosts = ghosts.filter((u) => allow.has(u.id));
    }
    const ghostIds = ghosts.map((u) => u.id);

    if (ghostIds.length === 0) {
      res.json({
        keyKind,
        mode,
        clerkUserCount: clerkUserIds.length,
        dbUserCount: allDbUsers.length,
        ghosts: [],
        message: "No ghost accounts found - nothing to do.",
      });
      return;
    }

    // ------------------------------------------------ blast radius (read)
    const affectedInvoices = await db
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        freelancerId: invoicesTable.freelancerId,
        clientId: invoicesTable.clientId,
        status: invoicesTable.status,
        anchorStatus: invoicesTable.anchorStatus,
      })
      .from(invoicesTable)
      .where(
        or(
          inArray(invoicesTable.freelancerId, ghostIds),
          inArray(invoicesTable.clientId, ghostIds),
        ),
      );
    const invoiceIds = affectedInvoices.map((i) => i.id);

    const grantsWhere = or(
      ...(invoiceIds.length > 0
        ? [inArray(grantsTable.invoiceId, invoiceIds)]
        : []),
      inArray(grantsTable.grantorId, ghostIds),
      inArray(grantsTable.granteeId, ghostIds),
    );
    const wrappedWhere = or(
      ...(invoiceIds.length > 0
        ? [inArray(wrappedKeysTable.invoiceId, invoiceIds)]
        : []),
      inArray(wrappedKeysTable.userId, ghostIds),
    );
    const reshareWhere = or(
      inArray(reshareNotificationsTable.recipientUserId, ghostIds),
      inArray(reshareNotificationsTable.resetterUserId, ghostIds),
    );

    // Explicit columns only - chain_wallets.private_key is never selected.
    const ghostWallets = await db
      .select({ id: chainWalletsTable.id, address: chainWalletsTable.address })
      .from(chainWalletsTable)
      .where(inArray(chainWalletsTable.id, ghostIds));

    const [grantRows, wrappedRows, eventRows, transferRows, pushRows, reshareRows] =
      await Promise.all([
        db.select({ id: grantsTable.id }).from(grantsTable).where(grantsWhere),
        db
          .select({ id: wrappedKeysTable.id })
          .from(wrappedKeysTable)
          .where(wrappedWhere),
        invoiceIds.length > 0
          ? db
              .select({ id: invoiceEventsTable.id })
              .from(invoiceEventsTable)
              .where(inArray(invoiceEventsTable.invoiceId, invoiceIds))
          : Promise.resolve([]),
        db
          .select({ id: walletTransfersTable.id })
          .from(walletTransfersTable)
          .where(inArray(walletTransfersTable.userId, ghostIds)),
        db
          .select({ token: pushTokensTable.token })
          .from(pushTokensTable)
          .where(inArray(pushTokensTable.userId, ghostIds)),
        db
          .select({ id: reshareNotificationsTable.id })
          .from(reshareNotificationsTable)
          .where(reshareWhere),
      ]);

    const report = {
      keyKind,
      mode,
      clerkUserCount: clerkUserIds.length,
      dbUserCount: allDbUsers.length,
      ghosts: ghosts.map((g) => ({
        id: g.id,
        displayName: g.displayName,
        email: g.email,
        walletAddress: ghostWallets.find((w) => w.id === g.id)?.address ?? null,
      })),
      keptUsers: allDbUsers
        .filter((u) => !ghostIds.includes(u.id))
        .map((u) => ({ id: u.id, displayName: u.displayName, isTestPersona: u.isTestPersona })),
      affectedInvoices,
      wouldDelete: {
        users: ghostIds.length,
        invoices: invoiceIds.length,
        invoiceEvents: eventRows.length,
        grants: grantRows.length,
        wrappedKeys: wrappedRows.length,
        walletTransfers: transferRows.length,
        pushTokens: pushRows.length,
        reshareNotifications: reshareRows.length,
        chainWallets: ghostWallets.length,
      },
    };

    if (mode === "dry-run") {
      logger.info(
        { ghostIds, wouldDelete: report.wouldDelete },
        "Ghost cleanup dry-run",
      );
      res.json(report);
      return;
    }

    // ------------------------------------------------------ apply: sweep
    // Best-effort recovery of test USDC back to the operator (funder)
    // wallet. A failed sweep never blocks deletion - the funds are
    // valueless testnet tokens and the wallet rows are about to go.
    const sweeps: Record<string, Record<string, string | boolean>> = {};
    if (sweepEnabled && ghostWallets.length > 0) {
      const [operatorWallet] = await db
        .select({ address: chainWalletsTable.address })
        .from(chainWalletsTable)
        .where(eq(chainWalletsTable.id, "operator"));
      if (!operatorWallet) {
        for (const wallet of ghostWallets) {
          sweeps[wallet.id] = { ok: false, reason: "no_operator_wallet" };
        }
      } else {
        for (const wallet of ghostWallets) {
          try {
            const result = await sweepWalletBalance(
              wallet.id,
              operatorWallet.address as Address,
            );
            sweeps[wallet.id] = describeSweep(result);
          } catch (err) {
            logger.warn(
              { err, walletId: wallet.id },
              "Ghost wallet sweep failed - continuing with deletion",
            );
            sweeps[wallet.id] = { ok: false, reason: "sweep_threw" };
          }
        }
      }
    }

    // ----------------------------------------------- apply: delete (1 tx)
    // Children first, then invoices, then user-owned rows, then the users.
    // The whole cleanup commits atomically or not at all.
    const deleted = await db.transaction(async (tx) => {
      const counts = {
        invoiceEvents: 0,
        grants: 0,
        wrappedKeys: 0,
        invoices: 0,
        walletTransfers: 0,
        pushTokens: 0,
        reshareNotifications: 0,
        chainWallets: 0,
        users: 0,
      };
      if (invoiceIds.length > 0) {
        counts.invoiceEvents =
          (
            await tx
              .delete(invoiceEventsTable)
              .where(inArray(invoiceEventsTable.invoiceId, invoiceIds))
          ).rowCount ?? 0;
      }
      counts.grants =
        (await tx.delete(grantsTable).where(grantsWhere)).rowCount ?? 0;
      counts.wrappedKeys =
        (await tx.delete(wrappedKeysTable).where(wrappedWhere)).rowCount ?? 0;
      if (invoiceIds.length > 0) {
        counts.invoices =
          (
            await tx
              .delete(invoicesTable)
              .where(inArray(invoicesTable.id, invoiceIds))
          ).rowCount ?? 0;
      }
      counts.walletTransfers =
        (
          await tx
            .delete(walletTransfersTable)
            .where(inArray(walletTransfersTable.userId, ghostIds))
        ).rowCount ?? 0;
      counts.pushTokens =
        (
          await tx
            .delete(pushTokensTable)
            .where(inArray(pushTokensTable.userId, ghostIds))
        ).rowCount ?? 0;
      counts.reshareNotifications =
        (
          await tx.delete(reshareNotificationsTable).where(reshareWhere)
        ).rowCount ?? 0;
      counts.chainWallets =
        (
          await tx
            .delete(chainWalletsTable)
            .where(inArray(chainWalletsTable.id, ghostIds))
        ).rowCount ?? 0;
      counts.users =
        (
          await tx.delete(usersTable).where(inArray(usersTable.id, ghostIds))
        ).rowCount ?? 0;
      return counts;
    });

    logger.info({ ghostIds, deleted, sweeps }, "Ghost cleanup applied");
    res.json({ ...report, deleted, sweeps });
  } catch (err) {
    logger.error({ err }, "Ghost cleanup failed");
    res.status(500).json({ error: "Ghost cleanup failed; see server logs." });
  }
});

export default router;
