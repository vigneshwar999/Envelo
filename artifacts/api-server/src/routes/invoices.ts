import { Router, type IRouter } from "express";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { parseUnits } from "viem";
import {
  db,
  grantsTable,
  invoiceEventsTable,
  invoicesTable,
  usersTable,
  wrappedKeysTable,
  type InvoiceRow,
} from "@workspace/db";
import {
  CreateInvoiceBody,
  CreateInvoiceResponse,
  GetEnvelopeResponse,
  GetInvoiceResponse,
  GetPayPreviewResponse,
  ListInvoiceEventsResponse,
  ListInvoicesResponse,
  PayInvoiceResponse,
  PaymentSubmittedBody,
  PaymentSubmittedResponse,
  RewrapInvoiceKeyBody,
  RewrapInvoiceKeyResponse,
  VerifyInvoiceBody,
  VerifyInvoiceResponse,
} from "@workspace/api-zod";
import {
  anchorInvoiceOnChain,
  attemptChainSetup,
  anchorFingerprintMatches,
  buildExternalPayment,
  confirmExternalPayment,
  decideAffordability,
  defaultPaymentMode,
  ensureWalletFor,
  estimatePayFeeWei,
  formatFeeUsdc,
  formatUsdc,
  getBalance,
  getLegacyContractAddress,
  isArcNetworkKey,
  isRpcConnected,
  mainnetSwitchedOn,
  networkByKey,
  networkForChainId,
  newPaymentSalt,
  payInvoiceOnChain,
  paymentTermsOf,
  readAnchor,
  reconcileExternalPayment,
  recordInvoicePaid,
  registryFor,
  resolvePayeeAddress,
  resolvePayeeForNetwork,
  ARC_TESTNET,
  FAUCET_URL,
  FEE_ESTIMATE_FALLBACK_WEI,
} from "../chain/arc";
import { assessAnchor } from "./chain";
import { fmt2, toEvent, toInvoice } from "../lib/serializers";
import { canSeeInvoice, findInvoice } from "../lib/access";
import { notifyClientOfNewInvoice } from "../lib/invoicePush";
import { insertSealedInvoice } from "../lib/keyBoundInserts";
import { rewrapForCounterparty, wrappedKeyHolders } from "../lib/keyReset";
import { userIdOf } from "../middlewares/requireAuth";

const router: IRouter = Router();

// One payment attempt per invoice at a time; a second click while the first
// transaction is still in flight gets an honest "in progress" answer instead
// of a second transaction.
const paymentsInFlight = new Set<string>();

async function namesById(): Promise<Map<string, string>> {
  const rows = await db.select().from(usersTable);
  return new Map(rows.map((row) => [row.id, row.displayName]));
}

router.get("/invoices", async (req, res) => {
  const userId = userIdOf(req);
  // Everything I sent or received...
  const mine = await db
    .select()
    .from(invoicesTable)
    .where(
      or(eq(invoicesTable.freelancerId, userId), eq(invoicesTable.clientId, userId)),
    )
    .orderBy(desc(invoicesTable.createdAt));
  // ...plus invoices someone shared with me through a grant that still works.
  const myGrants = await db
    .select()
    .from(grantsTable)
    .where(eq(grantsTable.granteeId, userId));
  const activeIds = new Set(
    myGrants
      .filter((g) => !g.revokedAt && g.expiresAt.getTime() > Date.now())
      .map((g) => g.invoiceId),
  );
  const seen = new Set(mine.map((row) => row.id));
  const granted: InvoiceRow[] = [];
  for (const id of activeIds) {
    if (seen.has(id)) continue;
    const [row] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
    if (row) granted.push(row);
  }
  const userRows = await db.select().from(usersTable);
  const names = new Map(userRows.map((row) => [row.id, row.displayName]));
  const all = [...mine, ...granted].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  // Lost-key flags: which wrapped copies still exist decides who needs a
  // re-share ("Re-share needed") and whose own copy is gone ("Locked").
  const access = {
    viewerId: userId,
    holdersByInvoice: await wrappedKeyHolders(all.map((row) => row.id)),
    publicKeyJwkById: new Map(userRows.map((row) => [row.id, row.publicKeyJwk])),
  };
  res.json(
    ListInvoicesResponse.parse(all.map((row) => toInvoice(row, names, access))),
  );
});

router.post("/invoices", async (req, res) => {
  const userId = userIdOf(req);
  const body = CreateInvoiceBody.parse(req.body);
  const [creator] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!creator) {
    res.status(409).json({
      error: "Your account is still being set up - refresh the page and try again.",
    });
    return;
  }
  const [client] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, body.clientId));
  if (!client) {
    res.status(400).json({ error: "That client is not a registered user." });
    return;
  }
  if (client.id === creator.id) {
    res.status(400).json({ error: "You cannot invoice yourself - pick another registered user as the client." });
    return;
  }
  if (client.publicKeyJwk === null) {
    res.status(400).json({
      error: `${client.displayName} has not finished setting up their account yet (no encryption key), so an envelope cannot be sealed for them. Ask them to open the app once.`,
    });
    return;
  }
  if (!/^[0-9a-f]{64}$/i.test(body.fingerprint)) {
    res
      .status(400)
      .json({ error: "The fingerprint must be a SHA-256 hex string." });
    return;
  }
  if (
    !/^\d+(\.\d{1,2})?$/.test(body.amountUsdc) ||
    !(Number(body.amountUsdc) > 0)
  ) {
    res.status(400).json({
      error:
        "The amount must be a positive number with at most two decimals, like 1500.00.",
    });
    return;
  }
  // The envelope must be openable by exactly the two parties: one wrapped key
  // for the creator, one for the client, nothing else. Anything less would
  // create an invoice nobody can ever read; anyone else gets access later
  // through a time-limited grant, so access stays revocable and expiring.
  const keyHolders = body.wrappedKeys.map((entry) => entry.userId);
  const uniqueHolders = new Set(keyHolders);
  if (
    keyHolders.length !== 2 ||
    uniqueHolders.size !== 2 ||
    !uniqueHolders.has(creator.id) ||
    !uniqueHolders.has(client.id)
  ) {
    res.status(400).json({
      error:
        "The envelope must be sealed with exactly two keys - one for you and one for the client - or nobody could ever open it. Refresh the page and try again.",
    });
    return;
  }

  // Which network this invoice lives on, forever. Live (mainnet) needs the
  // explicit on switch plus a payout wallet for the sender, because a live
  // payment goes straight to that wallet and no custodial fallback exists.
  const network = isArcNetworkKey(body.network) ? networkByKey(body.network) : ARC_TESTNET;
  const anchor = await assessAnchor(creator.id, network);
  if (anchor.blocker) {
    res.status(409).json({ error: `${anchor.blocker} Nothing was saved.` });
    return;
  }
  // Sandbox: the anchor transaction is paid by the SENDER's own wallet - no
  // sponsorship. Block creation only on an affirmative "can't afford": both
  // balance and fee were readable and the balance falls short. If the chain
  // is unreachable, sealing still works (the anchor stays pending and is
  // retried later) - blocking that path would gate offline sealing on RPC
  // health, and the pending state is already honest in the UI.
  if (
    network.mode === "sandbox" &&
    anchor.verdict !== null &&
    !anchor.verdict.canAfford &&
    anchor.feeWei !== null &&
    anchor.balanceWei !== null
  ) {
    res.status(409).json({
      error: `Sealing writes your invoice's fingerprint to ${network.name}, and that anchor transaction is paid from your wallet - about ${formatFeeUsdc(anchor.feeWei)} USDC in gas, but your wallet ${anchor.walletAddress} holds ${formatUsdc(anchor.balanceWei)} USDC. Get free test USDC at ${FAUCET_URL} (choose Arc Testnet), then seal again. Nothing was saved.`,
    });
    return;
  }
  // The payment terms the anchor commits to are fixed now, before any chain
  // write: the payee wallet (linked payout wallet, else the sandbox wallet)
  // and a fresh random salt.
  const payee = await resolvePayeeForNetwork(creator.id, network);
  if (!payee) {
    res.status(409).json({
      error: "Your payout wallet could not be resolved, so the invoice was not created. Nothing was saved.",
    });
    return;
  }

  // The two wraps were prepared in the creator's browser against keys read
  // earlier. Insert them bound to those exact keys, under row locks - if
  // either party rotated or reset meanwhile, this refuses instead of storing
  // a copy wrapped for a retired key (which would be unopenable forever
  // while every flag says healthy).
  const result = await insertSealedInvoice({
    creatorId: creator.id,
    clientId: client.id,
    creatorPublicKeyJwk: body.creatorPublicKeyJwk,
    clientPublicKeyJwk: body.clientPublicKeyJwk,
    invoiceNumber: body.invoiceNumber,
    amountUsdc: fmt2(body.amountUsdc),
    dueDate: body.dueDate ?? null,
    fingerprint: body.fingerprint.toLowerCase(),
    ciphertext: body.ciphertext,
    wrappedKeys: body.wrappedKeys,
    chainId: network.chainId,
    networkName: network.name,
    payeeAddress: payee.address,
    paymentSalt: newPaymentSalt(),
  });
  if (!result.ok) {
    if (result.reason === "no_user") {
      res.status(409).json({
        error: "One of the accounts on this invoice changed - reload the page and try again.",
      });
      return;
    }
    res.status(409).json({
      error:
        result.whose === "creator"
          ? "Your envelope key changed since this page loaded (rotated or reset in another tab?). Reload the page and seal the invoice again - the fresh page uses your current key."
          : `${result.displayName}'s envelope key changed while you were composing this invoice. Reload the page and seal it again so their copy targets the key they hold now.`,
    });
    return;
  }
  const invoice = result.invoice;

  // Anchor in the background so creation stays fast; status remains honest.
  anchorInvoiceOnChain(invoice.id).catch((err) =>
    req.log.warn({ err, invoiceId: invoice.id, msg: "background anchor failed" }),
  );

  // Tell the client's phone right away - fire-and-forget like the anchor: a
  // push problem must never fail (or slow down) the invoice itself.
  notifyClientOfNewInvoice(invoice, creator.displayName).catch((err) =>
    req.log.warn({ err, invoiceId: invoice.id, msg: "invoice push notification failed" }),
  );

  const names = await namesById();
  res.status(201).json(CreateInvoiceResponse.parse(toInvoice(invoice, names)));
});

// A payment sent from the client's own wallet can land while the app is not
// watching (tab closed before the confirmation call). The chain is the source
// of truth, so a detail read of an unpaid, anchored, commitment-backed
// invoice checks the registry - at most once every 15 seconds per invoice.
const reconciledAt = new Map<string, number>();
async function reconcileIfDue(invoice: InvoiceRow): Promise<InvoiceRow> {
  if (invoice.status === "paid" || invoice.anchorStatus !== "anchored") return invoice;
  if (!paymentTermsOf(invoice)) return invoice;
  const last = reconciledAt.get(invoice.id) ?? 0;
  if (Date.now() - last < 15_000) return invoice;
  reconciledAt.set(invoice.id, Date.now());
  const settled = await reconcileExternalPayment(invoice);
  if (!settled) return invoice;
  const network = networkForChainId(invoice.chainId);
  const names = await namesById();
  const updated = await recordInvoicePaid({
    invoiceId: invoice.id,
    txHash: settled.txHash,
    payerAddress: settled.payerAddress,
    actorId: invoice.clientId,
    detail: `${names.get(invoice.clientId) ?? "The client"} paid ${fmt2(invoice.amountUsdc)} USDC to ${names.get(invoice.freelancerId) ?? "the freelancer"} on ${network.name} from their own wallet${settled.payerAddress ? ` (${settled.payerAddress})` : ""}. The registry contract forwarded the money to ${invoice.payeeAddress} in one transaction.`,
  });
  return updated ?? invoice;
}

router.get("/invoices/:invoiceId", async (req, res) => {
  const userId = userIdOf(req);
  const found = await findInvoice(req.params.invoiceId);
  if (!found || !(await canSeeInvoice(found, userId))) {
    res.status(404).json({ error: "Invoice not found." });
    return;
  }
  // Serverless runtimes can stop the detached create-time anchor task as soon
  // as the response ends. A participant reading a pending invoice must await
  // the existing signed intent's reconciliation within this request.
  if (found.anchorStatus !== "anchored") {
    await anchorInvoiceOnChain(found.id);
  }
  const latest = found.anchorStatus === "anchored"
    ? found
    : (await findInvoice(found.id)) ?? found;
  const invoice = await reconcileIfDue(latest);
  const userRows = await db.select().from(usersTable);
  const names = new Map(userRows.map((row) => [row.id, row.displayName]));
  const access = {
    viewerId: userId,
    holdersByInvoice: await wrappedKeyHolders([invoice.id]),
    publicKeyJwkById: new Map(userRows.map((row) => [row.id, row.publicKeyJwk])),
  };
  res.json(GetInvoiceResponse.parse(toInvoice(invoice, names, access)));
});

router.post("/invoices/:invoiceId/pay", async (req, res) => {
  const userId = userIdOf(req);
  const invoice = await findInvoice(req.params.invoiceId);
  if (!invoice || !(await canSeeInvoice(invoice, userId))) {
    res.status(404).json({ error: "Invoice not found." });
    return;
  }
  if (invoice.status === "paid") {
    res.status(409).json({ error: "This invoice is already paid." });
    return;
  }
  const names = await namesById();
  if (userId !== invoice.clientId) {
    const clientName = names.get(invoice.clientId) ?? "the client";
    res.status(403).json({
      error: `Only ${clientName} can pay this invoice - it was addressed to them.`,
    });
    return;
  }
  const network = networkForChainId(invoice.chainId);
  if (network.mode === "live") {
    // Real money never moves through a server-held key. Live invoices are
    // paid from the client's own wallet and verified by payment-submitted.
    res.status(409).json({
      error: `This is a live invoice on ${network.name}. Pay it from your own wallet using the Pay button - Envelo never holds real funds for you.`,
    });
    return;
  }

  if (paymentsInFlight.has(invoice.id)) {
    res.status(409).json({
      error:
        "A payment for this invoice is already being processed. Give it a few seconds, then refresh.",
    });
    return;
  }
  paymentsInFlight.add(invoice.id);
  try {
    // Give the chain one chance to catch up on a pending anchor.
    await attemptChainSetup();

    if (!(await isRpcConnected(network))) {
      res.status(409).json({
        error: `${network.name} cannot be reached right now, so no real payment can happen. Nothing was charged - try again in a moment.`,
      });
      return;
    }
    const registry = registryFor(invoice);
    const contractAddress =
      registry.address ?? (await getLegacyContractAddress());
    if (!contractAddress) {
      res.status(409).json({
        error:
          "This invoice is still waiting for its sender-funded Arc anchor. Payment unlocks automatically after that real transaction confirms.",
      });
      return;
    }
    if (invoice.anchorStatus !== "anchored") {
      const anchored = await anchorInvoiceOnChain(invoice.id);
      if (!anchored) {
        res.status(409).json({
          error:
            "The invoice fingerprint is not anchored onchain yet, and payment goes through the same registry contract. Anchoring runs from the sender's wallet and needs it to cover the anchor fee - try again shortly, or ask the sender to top up their wallet.",
        });
        return;
      }
    }

    // If an earlier attempt's receipt timed out, the chain may already hold
    // the payment - check before asking the wallet for more money.
    const anchorState = await readAnchor(invoice.id);
    if (
      !anchorState.reachable ||
      !anchorState.anchored ||
      !anchorFingerprintMatches(anchorState.fingerprint, invoice.fingerprint)
    ) {
      res.status(409).json({
        error:
          "Payment is blocked because the real Arc anchor is missing or does not match this invoice fingerprint. Nothing was charged.",
      });
      return;
    }
    const alreadyPaidOnChain = anchorState.paid;

    if (!alreadyPaidOnChain) {
      // No subsidies: the payment leaves the payer's OWN wallet, so the
      // verdict is about their balance - invoice amount plus live gas. The
      // same rule (decideAffordability) powers the approval sheet's verdict,
      // so what the sheet said and what happens here cannot drift apart.
      const payerAddress = await ensureWalletFor(userId);
      const payerBalance = await getBalance(payerAddress);
      const terms = paymentTermsOf(invoice);
      const payee = terms
        ? { address: terms.payee }
        : await resolvePayeeAddress(invoice.freelancerId);
      const amountWei = parseUnits(fmt2(invoice.amountUsdc), 18);
      if (!payee) {
        res.status(409).json({
          error:
            "The real payee wallet is not available, so no payment was attempted.",
        });
        return;
      }
      const feeWei = await estimatePayFeeWei({
        invoice,
        payerAddress,
        payeeAddress: payee.address,
        amountWei,
      });
      if (payerBalance === null || feeWei === null) {
        res.status(409).json({
          error: `Your built-in wallet balance or the network fee cannot be read right now, so payment cannot be approved safely. Nothing was charged - try again in a moment.`,
        });
        return;
      }
      const verdict = decideAffordability(payerBalance, amountWei + feeWei);
      if (!verdict.canAfford) {
        res.status(409).json({
          error: `Insufficient funds: this payment needs ${fmt2(invoice.amountUsdc)} USDC plus about ${formatFeeUsdc(feeWei)} USDC in gas, but your wallet holds ${formatUsdc(payerBalance)} USDC - ${formatUsdc(verdict.shortfallWei)} USDC short. Send test USDC to your own wallet address ${payerAddress} via ${FAUCET_URL}, then try again. Nothing was charged.`,
        });
        return;
      }
    }

    // On commitment-backed invoices the destination was fixed at creation
    // and is enforced by the contract; older invoices resolve it inside
    // payInvoiceOnChain at submit time.
    const payResult = await payInvoiceOnChain({
      invoiceId: invoice.id,
      payerWalletId: userId,
      payeeWalletId: invoice.freelancerId,
      amountUsdc: fmt2(invoice.amountUsdc),
    });
    const txHash = payResult.txHash ?? invoice.payTxHash ?? null;
    const payerName = names.get(userId) ?? "The client";
    const payeeName = names.get(invoice.freelancerId) ?? "the freelancer";
    const updated = await recordInvoicePaid({
      invoiceId: invoice.id,
      txHash,
      payerAddress: payResult.payerAddress,
      actorId: userId,
      detail: payResult.alreadyPaidOnChain
        ? `${payerName}'s earlier payment had already gone through on ${network.name} - the app record just caught up with the chain.`
        : `${payerName} paid ${fmt2(invoice.amountUsdc)} USDC to ${payeeName} on ${network.name}. The money moved through the registry contract in one transaction${
            payResult.paidToLinkedWallet
              ? ` and landed in ${payeeName}'s own linked wallet`
              : ""
          }.`,
    });
    res.json(PayInvoiceResponse.parse(toInvoice(updated ?? invoice, names)));
  } finally {
    paymentsInFlight.delete(invoice.id);
  }
});

// The client paid from their OWN wallet and hands over the transaction hash.
// The hash is only a pointer; the server verifies the receipt against the
// registry (InvoicePaid event for this invoice, committed payee, exact
// amount) before anything is marked paid. Live invoices are paid only this
// way; sandbox invoices on a v4 anchor accept it too.
router.post("/invoices/:invoiceId/payment-submitted", async (req, res) => {
  const userId = userIdOf(req);
  const invoice = await findInvoice(req.params.invoiceId);
  if (!invoice || !(await canSeeInvoice(invoice, userId))) {
    res.status(404).json({ error: "Invoice not found." });
    return;
  }
  const names = await namesById();
  if (userId !== invoice.clientId) {
    res.status(403).json({
      error: `Only ${names.get(invoice.clientId) ?? "the client"} can report a payment for this invoice.`,
    });
    return;
  }
  const body = PaymentSubmittedBody.parse(req.body);
  const txHash = body.txHash.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    res.status(400).json({ error: "That is not a transaction hash." });
    return;
  }
  const network = networkForChainId(invoice.chainId);
  if (invoice.status === "paid") {
    // Reconciliation can record a payment it saw on the registry without
    // finding its transaction; a verified hash from the payer fills that in.
    let current = invoice;
    if (!invoice.payTxHash) {
      const outcome = await confirmExternalPayment(invoice, txHash as `0x${string}`);
      if (outcome.status === "paid") {
        const [withHash] = await db
          .update(invoicesTable)
          .set({ payTxHash: outcome.txHash })
          .where(and(eq(invoicesTable.id, invoice.id), isNull(invoicesTable.payTxHash)))
          .returning();
        current = withHash ?? invoice;
      }
    }
    res.json(
      PaymentSubmittedResponse.parse({
        status: "paid",
        invoice: toInvoice(current, names),
        message: "This invoice is already recorded as paid.",
      }),
    );
    return;
  }
  const outcome = await confirmExternalPayment(invoice, txHash as `0x${string}`);
  if (outcome.status === "rejected") {
    res.status(409).json({ error: outcome.reason });
    return;
  }
  if (outcome.status === "pending") {
    res.json(
      PaymentSubmittedResponse.parse({
        status: "pending",
        invoice: toInvoice(invoice, names),
        message: `${network.name} has not confirmed that transaction yet. The invoice updates as soon as it does.`,
      }),
    );
    return;
  }
  const payerName = names.get(userId) ?? "The client";
  const payeeName = names.get(invoice.freelancerId) ?? "the freelancer";
  const updated = await recordInvoicePaid({
    invoiceId: invoice.id,
    txHash: outcome.txHash,
    payerAddress: outcome.payerAddress,
    actorId: userId,
    detail: `${payerName} paid ${fmt2(invoice.amountUsdc)} USDC to ${payeeName} on ${network.name} from their own wallet (${outcome.payerAddress}). The registry contract checked the payment against the anchored terms and forwarded the money to ${invoice.payeeAddress} in one transaction.`,
  });
  res.json(
    PaymentSubmittedResponse.parse({
      status: "paid",
      invoice: toInvoice(updated ?? invoice, names),
      message: `Payment confirmed on ${network.name}.`,
    }),
  );
});

// Everything the Pay approval sheet shows, as live server facts: the exact
// amount, a fee estimated at this moment's gas price, the payer's real
// sandbox balance, one verdict (canPay) computed by the SAME rule the pay
// route enforces, and the exact transaction for paying from the client's own
// wallet - the sheet never re-derives money math client-side.
router.get("/invoices/:invoiceId/pay-preview", async (req, res) => {
  const userId = userIdOf(req);
  const invoice = await findInvoice(req.params.invoiceId);
  if (!invoice || !(await canSeeInvoice(invoice, userId))) {
    res.status(404).json({ error: "Invoice not found." });
    return;
  }
  if (userId !== invoice.clientId) {
    res.status(403).json({
      error: "Only the client this invoice is addressed to can pay it.",
    });
    return;
  }
  const network = networkForChainId(invoice.chainId);
  const connected = await isRpcConnected(network);
  const anchorState =
    connected && invoice.anchorStatus === "anchored"
      ? await readAnchor(invoice.id)
      : null;
  const anchorVerified =
    anchorState !== null &&
    anchorState.reachable &&
    anchorState.anchored &&
    anchorFingerprintMatches(anchorState.fingerprint, invoice.fingerprint);
  const registry = registryFor(invoice);
  const contractAddress = anchorVerified
    ? registry.address ?? (await getLegacyContractAddress())
    : null;
  const terms = paymentTermsOf(invoice);
  const payee = terms
    ? { address: terms.payee, linked: null as boolean | null }
    : await resolvePayeeAddress(invoice.freelancerId);
  const amountWei = parseUnits(fmt2(invoice.amountUsdc), 18);
  const alreadyPaid = invoice.status === "paid";
  const paymentMode = defaultPaymentMode(network);
  // The wallet transaction is only handed out when the server would stand
  // behind it right now: the registry really holds this anchor (a payment
  // against a missing anchor just reverts and burns the client's gas) and,
  // on live, the mainnet switch is on. Payments already broadcast still
  // settle through payment-submitted whatever this says.
  const liveHalted = network.mode === "live" && !mainnetSwitchedOn();
  const unavailableReason = alreadyPaid
    ? null
    : !connected
      ? `${network.name} is not reachable right now, so the payment cannot be prepared. Try again in a moment.`
      : liveHalted
        ? "Live payments are paused for maintenance. The invoice stays valid; try again later."
        : !anchorVerified
          ? "This invoice is still being anchored on Arc. Payment unlocks after its transaction confirms."
          : paymentMode === "external" && buildExternalPayment(invoice) === null
            ? "The payment transaction could not be built for this invoice, so it cannot be paid from a wallet yet."
            : null;
  const transaction =
    alreadyPaid || unavailableReason !== null ? null : buildExternalPayment(invoice);

  // The custodial side only exists in the sandbox; on live there is no
  // built-in wallet to price against.
  const payerAddress =
    network.mode === "sandbox" ? await ensureWalletFor(userId) : null;
  const payerBalance =
    connected && payerAddress ? await getBalance(payerAddress, network) : null;
  const feeWei = alreadyPaid
    ? null
    : contractAddress && payee && payerAddress
      ? await estimatePayFeeWei({
          invoice,
          payerAddress,
          payeeAddress: payee.address,
          amountWei,
        })
      : network.mode === "sandbox"
        ? FEE_ESTIMATE_FALLBACK_WEI
        : null;
  const totalWei = feeWei === null ? null : amountWei + feeWei;
  const verdict =
    paymentMode === "custodial" &&
    connected &&
    contractAddress !== null &&
    payee !== null &&
    payerBalance !== null &&
    totalWei !== null
      ? decideAffordability(payerBalance, totalWei)
      : null;
  const names = await namesById();
  const [payeeUser] = await db
    .select({ payoutAddress: usersTable.payoutAddress })
    .from(usersTable)
    .where(eq(usersTable.id, invoice.freelancerId));
  const paidToLinkedWallet =
    payee?.linked ??
    (payee !== null &&
      payeeUser?.payoutAddress?.toLowerCase() === payee.address.toLowerCase());
  res.json(
    GetPayPreviewResponse.parse({
      network: network.name,
      networkKey: network.key,
      networkMode: network.mode,
      chainId: network.chainId,
      contractAddress: contractAddress ?? null,
      explorerBaseUrl: network.explorerBaseUrl,
      faucetUrl: network.faucetUrl,
      paymentMode,
      transaction:
        transaction === null
          ? null
          : {
              chainId: transaction.chainId,
              chainIdHex: `0x${transaction.chainId.toString(16)}`,
              to: transaction.to,
              data: transaction.data,
              value: transaction.value,
            },
      amountUsdc: fmt2(invoice.amountUsdc),
      feeEstimateUsdc: feeWei === null ? null : formatFeeUsdc(feeWei),
      totalUsdc: totalWei === null ? null : formatFeeUsdc(totalWei),
      walletAddress: payerAddress,
      walletBalanceUsdc:
        payerBalance === null ? null : formatFeeUsdc(payerBalance),
      canPay: verdict === null ? null : verdict.canAfford,
      shortfallUsdc:
        verdict !== null && !verdict.canAfford
          ? formatFeeUsdc(verdict.shortfallWei)
          : null,
      unavailableReason,
      payeeAddress: payee?.address ?? null,
      payeeName: names.get(invoice.freelancerId) ?? null,
      paidToLinkedWallet,
      alreadyPaid,
    }),
  );
});

router.get("/invoices/:invoiceId/envelope", async (req, res) => {
  const userId = userIdOf(req);
  const invoice = await findInvoice(req.params.invoiceId);
  // Same rule as the invoice itself: outsiders (including revoked or expired
  // grantees) get a 404, so this endpoint cannot confirm an invoice exists.
  if (!invoice || !(await canSeeInvoice(invoice, userId))) {
    res.status(404).json({ error: "Invoice not found." });
    return;
  }

  let wrappedKey: string | null = null;
  let accessSource: "owner" | "client" | "grant" | null = null;
  let grantExpiresAt: string | null = null;

  // Direct wrapped keys are only honored for the two parties on the invoice.
  // Everyone else must come through an active grant so access can expire and
  // be revoked.
  const isOwner = userId === invoice.freelancerId;
  const isInvoiceClient = userId === invoice.clientId;
  if (isOwner || isInvoiceClient) {
    const [direct] = await db
      .select()
      .from(wrappedKeysTable)
      .where(
        and(
          eq(wrappedKeysTable.invoiceId, invoice.id),
          eq(wrappedKeysTable.userId, userId),
        ),
      );
    if (direct) {
      wrappedKey = direct.wrappedKey;
      accessSource = isOwner ? "owner" : "client";
    } else {
      // A party with no wrapped row means exactly one thing: they reset
      // their key, so their old copy was deleted as unrecoverable
      // ciphertext. Tell them the honest way back instead of the generic
      // grant hint below.
      const names = await namesById();
      const otherId = isOwner ? invoice.clientId : invoice.freelancerId;
      res.status(409).json({
        error: `This envelope was sealed for a key you no longer have. Ask ${
          names.get(otherId) ?? "the other party"
        } to open this invoice and press Re-share - their copy still works, and the envelope opens here again right after.`,
      });
      return;
    }
  }
  if (!wrappedKey) {
    const grants = await db
      .select()
      .from(grantsTable)
      .where(
        and(eq(grantsTable.invoiceId, invoice.id), eq(grantsTable.granteeId, userId)),
      );
    const active = grants.find(
      (g) => !g.revokedAt && g.expiresAt.getTime() > Date.now(),
    );
    if (active) {
      wrappedKey = active.wrappedKey;
      accessSource = "grant";
      grantExpiresAt = active.expiresAt.toISOString();
    }
  }

  if (!wrappedKey || !accessSource) {
    res.status(403).json({
      error:
        "You do not hold a key for this envelope. The invoice owner can grant you time-limited view access from the invoice page.",
    });
    return;
  }

  // Record only the FIRST open per user so refetches don't spam the timeline.
  const opened = await db
    .select()
    .from(invoiceEventsTable)
    .where(
      and(
        eq(invoiceEventsTable.invoiceId, invoice.id),
        eq(invoiceEventsTable.kind, "envelope_opened"),
        eq(invoiceEventsTable.actorId, userId),
      ),
    );
  if (opened.length === 0) {
    const names = await namesById();
    await db.insert(invoiceEventsTable).values({
      invoiceId: invoice.id,
      kind: "envelope_opened",
      actorId: userId,
      detail: `${names.get(userId) ?? "A user"} unlocked the sealed envelope in the browser${
        accessSource === "grant" ? " using a time-limited grant" : ""
      }. Decryption happened locally - the server only handed over ciphertext.`,
    });
  }

  res.json(
    GetEnvelopeResponse.parse({
      ciphertext: invoice.ciphertext,
      wrappedKey,
      accessSource,
      grantExpiresAt,
    }),
  );
});

// The other party lost their key and reset it; the caller still holds a
// working copy and re-wrapped the envelope key for the counterparty's NEW
// public key in their browser. Store that copy so the invoice opens for them
// again. Party-only: grant viewers cannot restore anybody's access.
router.post("/invoices/:invoiceId/rewrap", async (req, res) => {
  const userId = userIdOf(req);
  const body = RewrapInvoiceKeyBody.parse(req.body);
  const invoice = await findInvoice(req.params.invoiceId);
  if (!invoice || !(await canSeeInvoice(invoice, userId))) {
    res.status(404).json({ error: "Invoice not found." });
    return;
  }

  const userRows = await db.select().from(usersTable);
  const names = new Map(userRows.map((row) => [row.id, row.displayName]));

  const result = await rewrapForCounterparty(
    invoice,
    userId,
    body.wrappedKey,
    body.forPublicKeyJwk,
  );
  if (!result.ok) {
    if (result.reason === "not_a_party") {
      res.status(403).json({
        error: "Only the two parties on an invoice can re-share its envelope.",
      });
      return;
    }
    const otherId =
      userId === invoice.freelancerId ? invoice.clientId : invoice.freelancerId;
    const otherName = names.get(otherId) ?? "The other party";
    res.status(409).json({
      error:
        result.reason === "caller_locked"
          ? "Your own copy of this envelope key is gone too, so there is nothing you could re-share. Only someone who can still open this envelope can restore access."
          : result.reason === "counterparty_has_key"
            ? `${otherName} already holds a working key for this envelope - nothing to re-share.`
            : result.reason === "key_changed"
              ? `${otherName}'s key changed again since this page loaded. Reload the page and re-share once more.`
              : `${otherName} has no registered encryption key right now. Ask them to open the app once (that creates their new key), then re-share.`,
    });
    return;
  }

  const callerName = names.get(userId) ?? "A user";
  const otherName = names.get(result.counterpartyId) ?? "the other party";
  await db.insert(invoiceEventsTable).values({
    invoiceId: invoice.id,
    kind: "key_reshared",
    actorId: userId,
    detail: `${callerName} re-shared the sealed envelope with ${otherName} after a key reset. The envelope key was re-wrapped for ${otherName}'s new key in ${callerName}'s browser - the server never saw the document or any private key.`,
  });

  // Respond with the invoice carrying fresh flags so the client cache can
  // update in place.
  const access = {
    viewerId: userId,
    holdersByInvoice: await wrappedKeyHolders([invoice.id]),
    publicKeyJwkById: new Map(userRows.map((row) => [row.id, row.publicKeyJwk])),
  };
  res.json(RewrapInvoiceKeyResponse.parse(toInvoice(invoice, names, access)));
});

router.post("/invoices/:invoiceId/verify", async (req, res) => {
  const userId = userIdOf(req);
  const body = VerifyInvoiceBody.parse(req.body);
  const invoice = await findInvoice(req.params.invoiceId);
  if (!invoice || !(await canSeeInvoice(invoice, userId))) {
    res.status(404).json({ error: "Invoice not found." });
    return;
  }

  const computed = body.computedFingerprint.toLowerCase();
  const recordFingerprint = invoice.fingerprint.toLowerCase();
  const matchesRecord = computed === recordFingerprint;

  const anchor = await readAnchor(invoice.id);
  const networkName = networkForChainId(invoice.chainId).name;
  let onchainFingerprint: string | null = null;
  let matchesOnchain: boolean | null = null;
  if (anchor.reachable && anchor.anchored && anchor.fingerprint) {
    onchainFingerprint = anchor.fingerprint.toLowerCase();
    matchesOnchain = computed === onchainFingerprint;
  }

  let summary: string;
  if (matchesRecord && matchesOnchain === true) {
    summary = `The document is authentic. The fingerprint recomputed in your browser matches both the app's record and the copy anchored on ${networkName}.`;
  } else if (!matchesRecord) {
    summary =
      "Warning: the recomputed fingerprint does NOT match the recorded one. The document you decrypted is not the one that was originally sealed.";
  } else if (matchesOnchain === false) {
    summary =
      "Warning: the recomputed fingerprint matches the app's record but NOT the copy anchored onchain. That should never happen - treat this invoice as suspect.";
  } else if (!anchor.reachable) {
    summary = `The recomputed fingerprint matches the app's record. ${networkName} could not be reached just now, so the onchain copy was not double-checked.`;
  } else {
    summary =
      "The recomputed fingerprint matches the app's record. This invoice has not been anchored onchain yet, so there is no onchain copy to compare against.";
  }

  const names = await namesById();
  await db.insert(invoiceEventsTable).values({
    invoiceId: invoice.id,
    kind: "verified",
    actorId: userId,
    detail: `${names.get(userId) ?? "A user"} verified the document against the fingerprint. ${
      matchesRecord ? "Fingerprints matched." : "Fingerprints did NOT match."
    }`,
  });

  res.json(
    VerifyInvoiceResponse.parse({
      matchesRecord,
      matchesOnchain,
      recordFingerprint,
      onchainFingerprint,
      computedFingerprint: computed,
      anchorTxHash: invoice.anchorTxHash,
      checkedAt: new Date().toISOString(),
      summary,
    }),
  );
});

router.get("/invoices/:invoiceId/events", async (req, res) => {
  const userId = userIdOf(req);
  const invoice = await findInvoice(req.params.invoiceId);
  if (!invoice || !(await canSeeInvoice(invoice, userId))) {
    res.status(404).json({ error: "Invoice not found." });
    return;
  }
  const rows = await db
    .select()
    .from(invoiceEventsTable)
    .where(eq(invoiceEventsTable.invoiceId, invoice.id))
    .orderBy(asc(invoiceEventsTable.createdAt));
  res.json(ListInvoiceEventsResponse.parse(rows.map(toEvent)));
});

export default router;
