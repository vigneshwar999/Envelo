import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  chainWalletsTable,
  pushTokensTable,
  usersTable,
  walletTransfersTable,
  type UserRow,
} from "@workspace/db";
import { getAddress, parseUnits, type Address } from "viem";
import {
  BumpRotationFenceResponse,
  GetMeResponse,
  GetMyWalletResponse,
  ListMyTransfersResponse,
  ListMyWrappedKeysResponse,
  ListUsersResponse,
  LookupUserBody,
  LookupUserResponse,
  RegisterPushTokenBody,
  RegisterPushTokenResponse,
  ResetEncryptionKeyBody,
  ResetEncryptionKeyResponse,
  RotateEncryptionKeyBody,
  RotateEncryptionKeyResponse,
  SetDisplayNameBody,
  SetDisplayNameResponse,
  SetPayoutAddressBody,
  SetPayoutAddressResponse,
  SyncMeBody,
  SyncMeResponse,
  TransferMyBalanceResponse,
  WithdrawMyBalanceBody,
  WithdrawMyBalanceResponse,
} from "@workspace/api-zod";
import { notifyCounterpartiesOfReset } from "../lib/reshareNotify";
import {
  checkTxOutcome,
  settleReceiptIfUnchanged,
  ensureWalletFor,
  formatUsdc,
  getBalance,
  sendWalletFunds,
  sweepWalletBalance,
  EXPLORER_BASE_URL,
  NETWORK_NAME,
  SWEEP_GAS_RESERVE_WEI,
} from "../chain/arc";
import { userIdOf } from "../middlewares/requireAuth";
import { decideSettlement } from "../lib/receiptSettlement";
import { applyKeyReset, isUsableRsaPublicJwk } from "../lib/keyReset";
import {
  applyKeyRotation,
  bumpRotationFence,
  heldWrappedKeys,
} from "../lib/keyRotation";
import { applyUserSync } from "../lib/userSync";

const router: IRouter = Router();

async function walletAddresses(): Promise<Map<string, string>> {
  const rows = await db.select().from(chainWalletsTable);
  return new Map(rows.map((row) => [row.id, row.address]));
}

/** Full profile - only ever returned to the user it belongs to. */
function toUser(row: UserRow, walletAddress: string | null) {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    walletAddress,
    payoutAddress: row.payoutAddress,
    hasEncryptionKey: row.publicKeyJwk !== null,
    publicKeyJwk: row.publicKeyJwk,
    rotationFence: row.rotationFence,
  };
}

/**
 * Directory entry - what OTHER signed-in users may see. Email and wallet
 * address stay private; the public encryption key is included because that is
 * exactly what a public key is for: anyone may use it to seal an envelope
 * only this user can open.
 */
function toDirectoryUser(row: UserRow) {
  return {
    id: row.id,
    displayName: row.displayName,
    hasEncryptionKey: row.publicKeyJwk !== null,
    publicKeyJwk: row.publicKeyJwk,
  };
}

router.get("/users/me", async (req, res) => {
  const userId = userIdOf(req);
  const [row] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!row) {
    res.status(404).json({
      error: "Your account exists but has not been set up in this app yet.",
    });
    return;
  }
  const wallets = await walletAddresses();
  res.json(GetMeResponse.parse(toUser(row, wallets.get(userId) ?? null)));
});

// Called by the browser right after sign-in. It brings three things together:
// the Clerk identity (who you are), the browser-generated public encryption
// key (so others can seal envelopes for you), and a custodial Arc testnet
// wallet (so you can pay and receive test USDC).
router.post("/users/me/sync", async (req, res) => {
  const userId = userIdOf(req);
  const body = SyncMeBody.parse(req.body);

  try {
    const parsed: unknown = JSON.parse(body.publicKeyJwk);
    if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
  } catch {
    res.status(400).json({ error: "The encryption key is not valid JSON." });
    return;
  }

  // Read-decide-write happens inside one locked transaction (see
  // lib/userSync.ts) so a sign-in sync racing a key rotation can never
  // revert the registered key from a stale read.
  const syncResult = await applyUserSync({
    userId,
    displayName: body.displayName.trim() || "Unnamed user",
    email: body.email,
    publicKeyJwk: body.publicKeyJwk,
  });

  const walletAddress = await ensureWalletFor(userId);
  res.json(
    SyncMeResponse.parse({
      user: toUser(syncResult.user, walletAddress),
      created: syncResult.created,
    }),
  );
});

// The explicit "I lost my key and have no backup" action - the ONE place a
// registered public key may be replaced. Sync (above) refuses key swaps
// because a silent swap would quietly lock every old envelope; here the swap
// is deliberate, confirmed, and its cost is enforced honestly: the user's own
// wrapped envelope copies and any grants issued TO them are deleted, because
// they are unrecoverable ciphertext for a key that no longer exists. Each
// invoice comes back only when its other party re-shares it. Grants the user
// issued to others keep working - those were wrapped for other people's keys.
router.post("/users/me/reset-key", async (req, res) => {
  const userId = userIdOf(req);
  const body = ResetEncryptionKeyBody.parse(req.body);
  if (body.confirm !== "RESET") {
    res.status(400).json({
      error: "Confirmation phrase missing - type RESET to replace your key.",
    });
    return;
  }
  if (!isUsableRsaPublicJwk(body.publicKeyJwk)) {
    res.status(400).json({
      error:
        "The new encryption key is not a usable RSA public key - reload the app and try again.",
    });
    return;
  }
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!existing) {
    res.status(404).json({
      error: "Your account exists but has not been set up in this app yet.",
    });
    return;
  }
  if (existing.publicKeyJwk === body.publicKeyJwk) {
    res.status(400).json({
      error: "That is already your registered key - nothing to reset.",
    });
    return;
  }
  const updated = await applyKeyReset(userId, body.publicKeyJwk);
  // Heads-up emails to everyone who can now unblock this user with a
  // re-share. Fire and forget: the reset itself must succeed regardless,
  // and every failed send is logged loudly - the dashboard banner stays the
  // guaranteed in-app signal. Delivery is best-effort by design.
  notifyCounterpartiesOfReset({ resetterId: userId })
    .then((outcomes) => {
      for (const o of outcomes) {
        if (o.outcome === "send_failed") {
          req.log.warn({
            recipientId: o.recipientId,
            msg: "re-share heads-up email failed to send",
          });
        }
      }
    })
    .catch((err) =>
      req.log.warn({ err, msg: "re-share heads-up emails failed entirely" }),
    );
  const wallets = await walletAddresses();
  res.json(
    ResetEncryptionKeyResponse.parse(toUser(updated, wallets.get(userId) ?? null)),
  );
});

// Everything this account can currently open, as opaque wrapped blobs - the
// inventory a browser needs before rotating its envelope key. The blobs are
// ciphertext to the server, and they are only ever returned to the user they
// were wrapped for, so this reveals nothing new to anyone.
router.get("/users/me/wrapped-keys", async (req, res) => {
  const userId = userIdOf(req);
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!existing) {
    res.status(404).json({
      error: "Your account exists but has not been set up in this app yet.",
    });
    return;
  }
  const held = await heldWrappedKeys(userId);
  res.json(
    ListMyWrappedKeysResponse.parse({
      invoiceCopies: held.invoiceCopies.map((row) => ({
        invoiceId: row.invoiceId,
        wrappedKey: row.wrappedKey,
      })),
      grantCopies: held.grantCopies.map((row) => ({
        grantId: row.id,
        invoiceId: row.invoiceId,
        wrappedKey: row.wrappedKey,
      })),
    }),
  );
});

// The graceful key swap, for users who still HAVE their key. The browser did
// the cryptographic work already (unwrap with the old key, re-wrap for the
// new one); this endpoint applies the whole change atomically or not at all.
// Unlike reset-key, nothing is deleted and no counterparty ever notices -
// which is exactly why it does not need the RESET confirmation ritual.
router.post("/users/me/rotate-key", async (req, res) => {
  const userId = userIdOf(req);
  const body = RotateEncryptionKeyBody.parse(req.body);
  if (!isUsableRsaPublicJwk(body.newPublicKeyJwk)) {
    res.status(400).json({
      error:
        "The new encryption key is not a usable RSA public key - reload the app and try again.",
    });
    return;
  }
  const result = await applyKeyRotation({
    userId,
    fence: body.fence,
    currentPublicKeyJwk: body.currentPublicKeyJwk,
    newPublicKeyJwk: body.newPublicKeyJwk,
    invoiceCopies: body.invoiceCopies,
    grantCopies: body.grantCopies,
    dropGrantIds: body.dropGrantIds ?? [],
  });
  if (!result.ok) {
    switch (result.reason) {
      case "no_user":
        res.status(404).json({
          error: "Your account exists but has not been set up in this app yet.",
        });
        return;
      case "no_registered_key":
        res.status(400).json({
          error: "You have no registered envelope key yet - nothing to rotate.",
        });
        return;
      case "key_unchanged":
        res.status(400).json({
          error: "That is already your registered key - nothing to rotate.",
        });
        return;
      case "fence_changed":
        res.status(409).json({
          error:
            "A recovery check ran for this account after this page loaded. Reload the app and try again.",
        });
        return;
      case "key_changed":
        res.status(409).json({
          error:
            "Your registered key changed since this page loaded. Reload the app and try again.",
        });
        return;
      case "coverage_mismatch":
        res.status(409).json({
          error:
            "Your invoices or shared envelopes changed since this page loaded, so this rotation no longer covers everything. Reload the app and try again.",
        });
        return;
    }
  }
  req.log.info({
    msg: "envelope key rotated in place",
    rewrappedInvoiceCopies: result.rewrappedInvoiceCopies,
    rewrappedGrantCopies: result.rewrappedGrantCopies,
    droppedGrants: result.droppedGrants,
  });
  const wallets = await walletAddresses();
  res.json(
    RotateEncryptionKeyResponse.parse(toUser(result.user, wallets.get(userId) ?? null)),
  );
});

// The recovery half of crash-safe rotation. A browser that finds a staged
// key rotation whose outcome it never saw must not guess: it calls this
// first. The fence bump takes the same row lock every rotation takes, so a
// possibly still in-flight rotation either committed before the bump (the
// key returned here IS the staged key - promote it) or can never commit at
// all (fence_changed - the staged key is safe to discard). No third case.
router.post("/users/me/rotation-fence", async (req, res) => {
  const userId = userIdOf(req);
  const status = await bumpRotationFence(userId);
  if (!status) {
    res.status(404).json({
      error: "Your account exists but has not been set up in this app yet.",
    });
    return;
  }
  req.log.info({ msg: "rotation fence bumped", fence: status.fence });
  res.json(BumpRotationFenceResponse.parse(status));
});

// Link (or unlink, with address: null) a self-owned wallet. When linked,
// payments to this user are sent straight to that address instead of their
// app-managed custodial wallet. Sign-in is untouched - this is payout routing.
router.put("/users/me/payout-address", async (req, res) => {
  const userId = userIdOf(req);
  const body = SetPayoutAddressBody.parse(req.body);
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!existing) {
    res.status(404).json({
      error: "Your account exists but has not been set up in this app yet.",
    });
    return;
  }

  let normalized: string | null = null;
  if (body.address !== null) {
    try {
      // getAddress validates the format (and the checksum for mixed-case
      // input) and returns the canonical checksummed form.
      normalized = getAddress(body.address.trim());
    } catch {
      res.status(400).json({
        error:
          "That does not look like a valid wallet address. It should start with 0x followed by 40 letters and numbers - copy it exactly from your wallet.",
      });
      return;
    }
    const wallets = await walletAddresses();
    if (wallets.get(userId)?.toLowerCase() === normalized.toLowerCase()) {
      res.status(400).json({
        error:
          "That is the app-managed wallet you already have. To use it, simply unlink - no need to link it manually.",
      });
      return;
    }
  }

  const [updated] = await db
    .update(usersTable)
    .set({ payoutAddress: normalized })
    .where(eq(usersTable.id, userId))
    .returning();
  const wallets = await walletAddresses();
  res.json(
    SetPayoutAddressResponse.parse(toUser(updated!, wallets.get(userId) ?? null)),
  );
});

// The name shown on invoices, in pickers, and in new audit-trail entries -
// the letterhead. Sync never touches displayName after the row exists, so a
// name set here survives every future sign-in.
router.put("/users/me/display-name", async (req, res) => {
  const userId = userIdOf(req);
  const body = SetDisplayNameBody.parse(req.body);
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!existing) {
    res.status(404).json({
      error: "Your account exists but has not been set up in this app yet.",
    });
    return;
  }

  const name = body.displayName.trim().replace(/\s+/g, " ");
  if (name.length === 0) {
    res.status(400).json({
      error: "Please enter a name - this is what clients see on your invoices.",
    });
    return;
  }
  if (name.length > 60) {
    res.status(400).json({
      error: "That name is too long - please keep it under 60 characters.",
    });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ displayName: name })
    .where(eq(usersTable.id, userId))
    .returning();
  const wallets = await walletAddresses();
  res.json(
    SetDisplayNameResponse.parse(toUser(updated!, wallets.get(userId) ?? null)),
  );
});

// The mobile app calls this after the user allows notifications: it ties
// THIS device (the Expo push token) to THIS account. Upsert by token - the
// token identifies the device, so a device re-registering under a different
// account moves over, and a shared phone only ever buzzes for whoever
// signed in last.
router.put("/users/me/push-token", async (req, res) => {
  const userId = userIdOf(req);
  const body = RegisterPushTokenBody.parse(req.body);
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!me) {
    res.status(404).json({
      error: "Your account exists but has not been set up in this app yet.",
    });
    return;
  }
  // Expo push tokens have exactly one shape; anything else could never be
  // delivered to and would only rot in the table.
  if (
    body.token.length > 200 ||
    !/^Expo(nent)?PushToken\[[^\s[\]]+\]$/.test(body.token)
  ) {
    res.status(400).json({ error: "That does not look like an Expo push token." });
    return;
  }
  await db
    .insert(pushTokensTable)
    .values({ token: body.token, userId, platform: body.platform, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: pushTokensTable.token,
      set: { userId, platform: body.platform, updatedAt: new Date() },
    });
  res.json(RegisterPushTokenResponse.parse({ registered: true }));
});

// The app-managed wallet's live balance and how much a transfer would move.
// Read straight from the chain every time - when the RPC is unreachable the
// numbers come back null, never guessed.
router.get("/users/me/wallet", async (req, res) => {
  const userId = userIdOf(req);
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!existing) {
    res.status(404).json({
      error: "Your account exists but has not been set up in this app yet.",
    });
    return;
  }
  const address = await ensureWalletFor(userId);
  const balanceWei = await getBalance(address);
  const transferableWei =
    balanceWei === null
      ? null
      : balanceWei > SWEEP_GAS_RESERVE_WEI
        ? balanceWei - SWEEP_GAS_RESERVE_WEI
        : 0n;
  res.json(
    GetMyWalletResponse.parse({
      address,
      balanceUsdc: balanceWei === null ? null : formatUsdc(balanceWei),
      reserveUsdc: formatUsdc(SWEEP_GAS_RESERVE_WEI),
      transferableUsdc:
        transferableWei === null ? null : formatUsdc(transferableWei),
      // "Meaningful" = at least one display cent (0.01). A dust-only balance
      // would render a "Move 0.00 USDC" button, which helps nobody.
      canTransfer:
        existing.payoutAddress !== null &&
        transferableWei !== null &&
        transferableWei >= parseUnits("0.01", 18),
    }),
  );
});

// Receipts of past transfers out of the app-managed wallet, newest first.
// Only chain-confirmed transfers are listed, so this page never claims money
// moved when it did not. Before listing, any receipt still marked "sending"
// (a crash or slow confirmation interrupted it) is checked against the chain
// itself and settled - the tx hash is proof enough, no receipt gets lost.
router.get("/users/me/wallet/transfers", async (req, res) => {
  const userId = userIdOf(req);
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!existing) {
    res.status(404).json({
      error: "Your account exists but has not been set up in this app yet.",
    });
    return;
  }
  try {
    const unsettled = await db
      .select()
      .from(walletTransfersTable)
      .where(
        and(
          eq(walletTransfersTable.userId, userId),
          eq(walletTransfersTable.status, "sending"),
        ),
      );
    for (const receipt of unsettled) {
      const outcome = await checkTxOutcome(receipt.txHash as `0x${string}`);
      const settled = decideSettlement(
        outcome,
        Date.now() - receipt.lastAttemptAt.getTime(),
      );
      if (settled) {
        // Compare-and-set against exactly what was observed - a concurrent
        // confirmation or a revived retry makes this a safe no-op.
        await settleReceiptIfUnchanged(
          receipt.id,
          receipt.lastAttemptAt,
          settled,
        );
      }
    }
  } catch (err) {
    // Reconciliation is best-effort on every load; the list below still
    // shows everything already settled.
    console.error("Could not reconcile in-flight transfer receipts:", err);
  }
  const rows = await db
    .select()
    .from(walletTransfersTable)
    .where(
      and(
        eq(walletTransfersTable.userId, userId),
        eq(walletTransfersTable.status, "confirmed"),
      ),
    )
    .orderBy(desc(walletTransfersTable.createdAt));
  res.json(
    ListMyTransfersResponse.parse(
      rows.map((row) => ({
        id: row.id,
        amountUsdc: formatUsdc(BigInt(row.amountWei)),
        toAddress: row.toAddress,
        txHash: row.txHash,
        explorerTxUrl: `${EXPLORER_BASE_URL}/tx/${row.txHash}`,
        createdAt: row.createdAt.toISOString(),
      })),
    ),
  );
});

// Move what already sits in the app-managed wallet to the linked wallet.
// Linking only redirects FUTURE payments; this closes the gap for money that
// arrived before linking. A real native transfer on Arc - no mocked receipts.
router.post("/users/me/wallet/transfer", async (req, res) => {
  const userId = userIdOf(req);
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!existing) {
    res.status(404).json({
      error: "Your account exists but has not been set up in this app yet.",
    });
    return;
  }
  if (!existing.payoutAddress) {
    res.status(400).json({
      error:
        "Link your own wallet first - right now there is nowhere to move the balance to.",
    });
    return;
  }
  await ensureWalletFor(userId);
  const result = await sweepWalletBalance(userId, existing.payoutAddress as Address);
  if (!result.ok) {
    switch (result.reason) {
      case "rpc_unreachable":
        res.status(409).json({
          error: `${NETWORK_NAME} cannot be reached right now, so the balance cannot be read or moved. Nothing was sent - try again in a moment.`,
        });
        return;
      case "nothing_to_sweep":
        res.status(409).json({
          error: `After keeping ${formatUsdc(SWEEP_GAS_RESERVE_WEI)} USDC aside for the network fee, there is nothing to move right now (the wallet holds ${formatUsdc(result.balanceWei)} USDC).`,
        });
        return;
      case "insufficient":
        // A sweep asks for "max", so this cannot happen here - kept only so
        // the switch stays total over every send outcome.
        res.status(409).json({
          error: `After keeping ${formatUsdc(SWEEP_GAS_RESERVE_WEI)} USDC aside for the network fee, up to ${formatUsdc(result.maxWei)} USDC can move right now (the wallet holds ${formatUsdc(result.balanceWei)} USDC).`,
        });
        return;
      case "send_failed":
        res.status(502).json({
          error: `${NETWORK_NAME} rejected the transfer before anything was sent, so no money moved. Try again in a moment.`,
        });
        return;
      case "receipt_unavailable":
        res.status(503).json({
          error:
            "The permanent receipt for this transfer could not be prepared, so nothing was sent - no money moved. Try again in a moment.",
        });
        return;
      case "unconfirmed":
        res.status(502).json({
          error: `The transfer may have gone out, but ${NETWORK_NAME} has not confirmed it yet. Check ${EXPLORER_BASE_URL}/tx/${result.txHash} - if it shows Success, the money moved and its receipt will appear under Past transfers shortly. If the network never saw it, nothing moved and the attempt is automatically recorded as failed. Do not retry immediately.`,
        });
        return;
    }
  }
  // The receipt row was written by sweepWalletBalance itself BEFORE the
  // transaction was broadcast, and marked confirmed with the confirmation -
  // nothing to store here.
  res.json(
    TransferMyBalanceResponse.parse({
      txHash: result.txHash,
      amountUsdc: formatUsdc(result.amountWei),
      toAddress: existing.payoutAddress,
      explorerTxUrl: `${EXPLORER_BASE_URL}/tx/${result.txHash}`,
    }),
  );
});

// Send a chosen amount from the app-managed wallet to any Arc address the
// user names. Same machinery as the balance sweep above - a real native
// transfer with its receipt written before broadcast - but the amount and
// destination come from the request instead of the linked payout wallet.
router.post("/users/me/wallet/withdraw", async (req, res) => {
  const userId = userIdOf(req);
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!existing) {
    res.status(404).json({
      error: "Your account exists but has not been set up in this app yet.",
    });
    return;
  }
  const body = WithdrawMyBalanceBody.parse(req.body);
  let to: Address;
  try {
    // getAddress validates the format (and the checksum for mixed-case
    // input) and returns the canonical spelling.
    to = getAddress(body.toAddress.trim());
  } catch {
    res.status(400).json({
      error:
        "That is not a valid wallet address. It should start with 0x followed by 40 letters and digits.",
    });
    return;
  }
  const rawAmount = body.amountUsdc.trim();
  // Strict decimal shape so nothing odd ever reaches the unit parser: plain
  // digits, an optional fraction of at most 18 places (USDC's precision on
  // Arc), no signs, no exponents.
  if (!/^\d{1,10}(\.\d{1,18})?$/.test(rawAmount)) {
    res.status(400).json({
      error:
        "Enter the amount as a plain number like 1.50 (digits only, up to 18 decimal places).",
    });
    return;
  }
  const amountWei = parseUnits(rawAmount, 18);
  if (amountWei < parseUnits("0.01", 18)) {
    res.status(400).json({
      error: "The smallest withdrawal is 0.01 test USDC.",
    });
    return;
  }
  const myAddress = await ensureWalletFor(userId);
  if (to.toLowerCase() === myAddress.toLowerCase()) {
    res.status(400).json({
      error:
        "That is this wallet's own address - a withdrawal has to go somewhere else.",
    });
    return;
  }
  const result = await sendWalletFunds(userId, to, amountWei);
  if (!result.ok) {
    switch (result.reason) {
      case "rpc_unreachable":
        res.status(409).json({
          error: `${NETWORK_NAME} cannot be reached right now, so the balance cannot be read or moved. Nothing was sent - try again in a moment.`,
        });
        return;
      case "nothing_to_sweep":
        // Only "max" sends report this; kept so the switch stays total.
        res.status(409).json({
          error: `After keeping ${formatUsdc(SWEEP_GAS_RESERVE_WEI)} USDC aside for the network fee, there is nothing to withdraw right now (the wallet holds ${formatUsdc(result.balanceWei)} USDC).`,
        });
        return;
      case "insufficient":
        res.status(409).json({
          error: `After keeping ${formatUsdc(SWEEP_GAS_RESERVE_WEI)} USDC aside for the network fee, up to ${formatUsdc(result.maxWei)} USDC can be withdrawn right now (the wallet holds ${formatUsdc(result.balanceWei)} USDC).`,
        });
        return;
      case "send_failed":
        res.status(502).json({
          error: `${NETWORK_NAME} rejected the withdrawal before anything was sent, so no money moved. Try again in a moment.`,
        });
        return;
      case "receipt_unavailable":
        res.status(503).json({
          error:
            "The permanent receipt for this withdrawal could not be prepared, so nothing was sent - no money moved. Try again in a moment.",
        });
        return;
      case "unconfirmed":
        res.status(502).json({
          error: `The withdrawal may have gone out, but ${NETWORK_NAME} has not confirmed it yet. Check ${EXPLORER_BASE_URL}/tx/${result.txHash} - if it shows Success, the money moved and its receipt will appear under Past transfers shortly. If the network never saw it, nothing moved and the attempt is automatically recorded as failed. Do not retry immediately.`,
        });
        return;
    }
  }
  res.json(
    WithdrawMyBalanceResponse.parse({
      txHash: result.txHash,
      amountUsdc: formatUsdc(result.amountWei),
      toAddress: to,
      explorerTxUrl: `${EXPLORER_BASE_URL}/tx/${result.txHash}`,
    }),
  );
});

router.get("/users", async (_req, res) => {
  // Test personas (wallet e2e, backup-reminder checks) stay out of the
  // directory so client/grant pickers never show them in a demo. They
  // remain full users otherwise - sign-in, invoices, wallets all work.
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.isTestPersona, false))
    .orderBy(asc(usersTable.displayName));
  res.json(ListUsersResponse.parse(rows.map(toDirectoryUser)));
});

// Find ONE user by exact email or custodial wallet address - the invoice
// form's client field. The same visibility rule as the directory applies
// (test personas stay hidden), and the answer never echoes the email or
// address searched for: a match returns only the public directory entry,
// so this reveals nothing the directory itself does not already show.
router.post("/users/lookup", async (req, res) => {
  const parsed = LookupUserBody.safeParse(req.body);
  const query = parsed.success ? parsed.data.query.trim() : "";
  const isAddressShaped = /^0x[0-9a-fA-F]{40}$/.test(query);
  const isEmailShaped = !isAddressShaped && query.includes("@");
  if (!isAddressShaped && !isEmailShaped) {
    res.status(400).json({
      error: "Enter a full email address or a 0x wallet address.",
    });
    return;
  }

  let row: UserRow | undefined;
  if (isAddressShaped) {
    // Custodial deposit addresses only - the address a client would have
    // seen on a payment or been handed for a deposit. Linked payout
    // addresses are external wallets and deliberately not searchable.
    const [hit] = await db
      .select({ user: usersTable })
      .from(chainWalletsTable)
      .innerJoin(usersTable, eq(usersTable.id, chainWalletsTable.id))
      .where(
        and(
          sql`lower(${chainWalletsTable.address}) = ${query.toLowerCase()}`,
          eq(usersTable.isTestPersona, false),
        ),
      );
    row = hit?.user;
  } else {
    const [hit] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          sql`lower(${usersTable.email}) = ${query.toLowerCase()}`,
          eq(usersTable.isTestPersona, false),
        ),
      );
    row = hit;
  }

  res.json(
    LookupUserResponse.parse(
      row ? { found: true, user: toDirectoryUser(row) } : { found: false },
    ),
  );
});

export default router;
