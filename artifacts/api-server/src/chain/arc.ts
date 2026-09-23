// All Arc interaction lives here. Network facts (chain ids, RPCs, explorers)
// are in ./networks; this file holds the wallets, the transaction queue, and
// the anchor / payment logic that runs against whichever network an invoice
// was created on. Custodial wallets, sweeps and the faucet are sandbox-only
// (Arc Testnet); live invoices (Arc Mainnet) never touch a custodial key.
import {
  createWalletClient,
  formatUnits,
  http,
  keccak256,
  parseTransaction,
  parseUnits,
  recoverTransactionAddress,
  toBytes,
  type Address,
  type Hex,
  type PrivateKeyAccount,
  type TransactionSerialized,
} from "viem";
import { TransactionReceiptNotFoundError } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { and, eq, ne, sql } from "drizzle-orm";
import {
  db,
  chainStateTable,
  chainWalletsTable,
  invoiceEventsTable,
  invoicesTable,
  usersTable,
  walletTransfersTable,
  type InvoiceRow,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { fmt2 } from "../lib/serializers";
import { REGISTRY_ABI } from "./registryArtifact";
import {
  ARC_MAINNET,
  ARC_TESTNET,
  REGISTRY_VERSION,
  mainnetAvailability,
  mainnetOperatorAccount,
  mainnetOperatorMinBalanceUsdc,
  networkForChainId,
  type ArcNetwork,
} from "./networks";
import {
  encodeAnchorCall,
  encodePayCall,
  encodePayCallV3,
  findInvoicePaidLog,
  invoiceKey,
  isBytes32Hex,
  newPaymentSalt,
  paymentCommitment,
  paymentSettlesInvoice,
  type InvoicePaidEvent,
} from "./registry";

export { invoiceKey, newPaymentSalt } from "./registry";
export {
  ARC_MAINNET,
  ARC_TESTNET,
  ARC_NETWORKS,
  REGISTRY_VERSION,
  creatableNetworks,
  isMainnetEnabled,
  mainnetAvailability,
  mainnetOperatorMinBalanceUsdc,
  mainnetSwitchedOn,
  networkByKey,
  networkForChainId,
  isArcNetworkKey,
  type ArcNetwork,
  type ArcNetworkKey,
  type ArcNetworkMode,
} from "./networks";

// Sandbox constants, kept under their old names: custodial wallets, sweeps,
// deposits and the faucet only exist on Arc Testnet.
export const ARC_CHAIN_ID = ARC_TESTNET.chainId;
export const FAUCET_URL = ARC_TESTNET.faucetUrl!;
export const EXPLORER_BASE_URL = ARC_TESTNET.explorerBaseUrl;
export const NETWORK_NAME = ARC_TESTNET.name;
export const publicClient = ARC_TESTNET.publicClient;

/**
 * How an invoice gets paid. "custodial": the server pays from the client's
 * sandbox wallet. "external": the client pays from their own wallet in the
 * browser and the server only verifies the resulting transaction. Live
 * invoices are external only; sandbox invoices default to custodial but
 * accept an external payment too (v4 anchors carry the same commitment on
 * both networks), which is how the wallet flow gets exercised for free.
 */
export type PaymentMode = "custodial" | "external";

export function defaultPaymentMode(network: ArcNetwork): PaymentMode {
  return network.mode === "live" ? "external" : "custodial";
}

/** Format a native-USDC wei amount (18 decimals) as a "12.34" string. */
export function formatUsdc(wei: bigint): string {
  const s = formatUnits(wei, 18);
  const [whole, frac = ""] = s.split(".");
  return `${whole}.${(frac + "00").slice(0, 2)}`;
}

/**
 * Format a tiny fee amount (like an anchor gas estimate) honestly: up to 8
 * decimals with trailing zeros trimmed, and a POSITIVE amount never rendered
 * as "0" - anything below display precision becomes "<0.00000001" instead,
 * because striking through "0" would misstate a real nonzero fee.
 */
export function formatFeeUsdc(wei: bigint): string {
  if (wei === 0n) return "0";
  const [whole, frac = ""] = formatUnits(wei, 18).split(".");
  const trimmed = frac.slice(0, 8).replace(/0+$/, "");
  if (whole === "0" && !trimmed) return "<0.00000001";
  return trimmed ? `${whole}.${trimmed}` : whole;
}

// ---------------------------------------------------- fee affordability
// Sandbox: every onchain action is paid by the person acting - senders pay
// their own anchor gas, payers pay the invoice amount plus gas. Live: Envelo's
// operator wallet pays the anchor gas; the client pays amount plus gas from
// their own wallet. Nobody's transaction is ever sponsored beyond that.

/**
 * Permanent fee estimate used whenever the SANDBOX cannot return a live
 * estimate. It is deliberately denominated in Arc's native test USDC rather
 * than gas units so every approval surface shows the same predictable
 * fallback. Live never falls back: an unreadable mainnet fee is reported as
 * unavailable and blocks the action instead of guessing with real money.
 */
export const FEE_ESTIMATE_FALLBACK_WEI = parseUnits("0.1", 18);

function feeFallbackFor(network: ArcNetwork): bigint | null {
  return network.mode === "sandbox" ? FEE_ESTIMATE_FALLBACK_WEI : null;
}

/**
 * THE affordability rule, in one place: can this balance cover this cost?
 * Inclusive on purpose - an exact balance is enough. Previews and the real
 * send guards both call this, so the sheet's verdict and the server's
 * decision can never drift apart.
 */
export function decideAffordability(
  balanceWei: bigint,
  requiredWei: bigint,
): { canAfford: boolean; shortfallWei: bigint } {
  const canAfford = balanceWei >= requiredWei;
  return { canAfford, shortfallWei: canAfford ? 0n : requiredWei - balanceWei };
}

// ---------------------------------------------------------------- wallets

// Custodial wallets exist for the SANDBOX only. They hold valueless test USDC
// so the demo can anchor and pay without asking anyone to install a wallet.
// Live invoices are anchored by the operator key from the environment and
// paid from the client's own wallet; no custodial key ever signs on mainnet.

/**
 * Create a custodial testnet wallet for an owner id ("operator" or a user id)
 * if it doesn't exist yet. Returns the wallet address either way.
 */
export async function ensureWalletFor(ownerId: string): Promise<string> {
  const [existing] = await db
    .select()
    .from(chainWalletsTable)
    .where(eq(chainWalletsTable.id, ownerId));
  if (existing) return existing.address;
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  await db
    .insert(chainWalletsTable)
    .values({ id: ownerId, address: account.address, privateKey })
    .onConflictDoNothing();
  // A concurrent sync may have won the insert race; read back the truth.
  const [row] = await db
    .select()
    .from(chainWalletsTable)
    .where(eq(chainWalletsTable.id, ownerId));
  logger.info(
    { walletId: ownerId, address: row?.address },
    "Custodial Arc testnet wallet ready",
  );
  return row?.address ?? account.address;
}

/** The app's deployment wallet - used only to deploy or upgrade the registry. */
export async function ensureOperatorWallet(): Promise<void> {
  await ensureWalletFor("operator");
}

export async function getWallet(id: string) {
  const [row] = await db
    .select()
    .from(chainWalletsTable)
    .where(eq(chainWalletsTable.id, id));
  return row ?? null;
}

async function getChainState(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(chainStateTable)
    .where(eq(chainStateTable.key, key));
  return row?.value ?? null;
}

async function setChainState(key: string, value: string): Promise<void> {
  await db
    .insert(chainStateTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: chainStateTable.key,
      set: { value, updatedAt: new Date() },
    });
}

async function deleteChainState(key: string): Promise<void> {
  await db.delete(chainStateTable).where(eq(chainStateTable.key, key));
}

type PendingSignedTransaction = {
  hash: Hex;
  serialized: Hex;
  paidToLinkedWallet?: boolean;
};

function parsePendingSignedTransaction(value: string): PendingSignedTransaction {
  const parsed = JSON.parse(value) as PendingSignedTransaction;
  if (
    !/^0x[0-9a-f]+$/i.test(parsed.serialized) ||
    !/^0x[0-9a-f]{64}$/i.test(parsed.hash) ||
    keccak256(parsed.serialized) !== parsed.hash
  ) {
    throw new Error("Stored signed transaction failed its integrity check");
  }
  return parsed;
}

function pendingTransactionKey(
  kind: "anchor" | "payment",
  invoiceId: string,
): string {
  return `pending:${kind}:${invoiceId}`;
}

async function getPendingSignedTransaction(
  kind: "anchor" | "payment",
  invoiceId: string,
): Promise<PendingSignedTransaction | null> {
  const value = await getChainState(pendingTransactionKey(kind, invoiceId));
  if (!value) return null;
  return parsePendingSignedTransaction(value);
}

async function persistSignedTransaction(
  kind: "anchor" | "payment",
  invoiceId: string,
  transaction: PendingSignedTransaction,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(chainStateTable)
      .values({
        key: pendingTransactionKey(kind, invoiceId),
        value: JSON.stringify(transaction),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: chainStateTable.key,
        set: { value: JSON.stringify(transaction), updatedAt: new Date() },
      });
    await tx
      .update(invoicesTable)
      .set(
        kind === "anchor"
          ? { anchorTxHash: transaction.hash }
          : { payTxHash: transaction.hash },
      )
      .where(eq(invoicesTable.id, invoiceId));
  });
}

async function clearPendingSignedTransaction(
  kind: "anchor" | "payment",
  invoiceId: string,
): Promise<void> {
  await deleteChainState(pendingTransactionKey(kind, invoiceId));
}

/**
 * The v3 sandbox registry that the first sender deployed (kept in chain_state
 * by the old bootstrap code). Only invoices anchored before v4 point at it,
 * and each of those rows carries its own pinned address, so this is just a
 * fallback for reading a legacy row that somehow lost its pin.
 */
export async function getLegacyContractAddress(): Promise<Address | null> {
  return (await getChainState("contractAddress")) as Address | null;
}

/**
 * The registry an invoice's anchor lives on: the address pinned at anchor
 * time when there is one, else the network's current registry (where a
 * still-pending anchor will land). Null when the network has no registry
 * configured yet - a setup problem, never something to paper over.
 */
export function registryFor(
  invoice: Pick<InvoiceRow, "chainId" | "contractAddress" | "registryVersion">,
): { network: ArcNetwork; address: Address | null; version: number } {
  const network = networkForChainId(invoice.chainId);
  if (invoice.contractAddress) {
    return {
      network,
      address: invoice.contractAddress as Address,
      // Rows anchored before the version column existed were all v3.
      version: invoice.registryVersion ?? 3,
    };
  }
  return { network, address: network.registryAddress, version: REGISTRY_VERSION };
}

export async function isRpcConnected(
  network: ArcNetwork = ARC_TESTNET,
): Promise<boolean> {
  try {
    await network.publicClient.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}

export async function getBalance(
  address: string,
  network: ArcNetwork = ARC_TESTNET,
): Promise<bigint | null> {
  try {
    return await network.publicClient.getBalance({ address: address as Address });
  } catch {
    return null;
  }
}

function walletClientFor(privateKey: string, network: ArcNetwork = ARC_TESTNET) {
  return walletClientForAccount(
    privateKeyToAccount(privateKey as `0x${string}`),
    network,
  );
}

function walletClientForAccount(account: PrivateKeyAccount, network: ArcNetwork) {
  return createWalletClient({
    account,
    chain: network.chain,
    transport: http(network.rpcUrl, { timeout: 8_000 }),
  });
}

type SigningWallet = ReturnType<typeof walletClientForAccount>;

async function signTransactionBeforeBroadcast(
  wallet: SigningWallet,
  request: { to?: Address; data: Hex; value?: bigint },
): Promise<{ hash: Hex; serialized: Hex; nonce: number }> {
  const prepared = await wallet.prepareTransactionRequest({
    account: wallet.account,
    ...request,
  });
  const serialized = await wallet.signTransaction(prepared);
  return {
    hash: keccak256(serialized),
    serialized,
    nonce: prepared.nonce,
  };
}

async function submitSignedTransaction(
  network: ArcNetwork,
  transaction: PendingSignedTransaction,
  what: string,
) {
  if (keccak256(transaction.serialized) !== transaction.hash) {
    throw new Error(`${what} signed transaction hash does not match its bytes`);
  }
  const client = network.publicClient;
  try {
    const receipt = await client.getTransactionReceipt({
      hash: transaction.hash,
    });
    if (receipt.status !== "success") {
      throw new Error(
        `${what} transaction ${transaction.hash} was mined but reverted`,
      );
    }
    return receipt;
  } catch (err) {
    if (!(err instanceof TransactionReceiptNotFoundError)) throw err;
  }

  try {
    const broadcastHash = await client.sendRawTransaction({
      serializedTransaction: transaction.serialized,
    });
    if (broadcastHash !== transaction.hash) {
      throw new Error(`${what} broadcast returned an unexpected hash`);
    }
  } catch (broadcastError) {
    // Re-broadcasting the exact same signed bytes is idempotent. Some RPCs
    // answer "already known"; accept that only when the hash is visible.
    try {
      await client.getTransaction({ hash: transaction.hash });
    } catch {
      throw broadcastError;
    }
  }
  return waitForSuccess(network, transaction.hash, what);
}

// Every transaction send goes through both a process-local queue and a
// Postgres advisory lock, one pair per network. The database lock extends
// serialization across API instances, preventing two servers from spending
// the same custodial or operator nonce concurrently. The two networks never
// share a nonce space, so they queue independently.
const txQueues = new Map<number, Promise<unknown>>();
function enqueueTx<T>(network: ArcNetwork, fn: () => Promise<T>): Promise<T> {
  const run = () =>
    db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(${network.chainId}, ${731_504})`,
      );
      return fn();
    });
  const queue = txQueues.get(network.chainId) ?? Promise.resolve();
  const next = queue.then(run, run);
  txQueues.set(
    network.chainId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

/** Wait for a receipt and refuse to treat a mined-but-reverted tx as success. */
async function waitForSuccess(
  network: ArcNetwork,
  hash: `0x${string}`,
  what: string,
) {
  const receipt = await network.publicClient.waitForTransactionReceipt({
    hash,
    timeout: 20_000,
  });
  if (receipt.status !== "success") {
    throw new Error(`${what} transaction ${hash} was mined but reverted`);
  }
  return receipt;
}

// ------------------------------------------------- setup (retry pending anchors)

let setupInFlight: Promise<void> | null = null;

/**
 * Idempotent and safe to call often: re-drives every anchor that is still
 * pending on a reachable network (a sandbox sender who has since topped up,
 * a live invoice whose operator submission timed out).
 */
export function attemptChainSetup(): Promise<void> {
  if (!setupInFlight) {
    setupInFlight = runChainSetup().finally(() => {
      setupInFlight = null;
    });
  }
  return setupInFlight;
}

async function runChainSetup(): Promise<void> {
  try {
    await retryPendingAnchors();
  } catch (err) {
    logger.warn(
      { err },
      "Chain setup attempt did not finish (retried on next status check)",
    );
  }
}

// -------------------------------------------------------- balance sweeps

/**
 * Kept behind when moving a custodial wallet's balance out, so the sweep
 * transaction can always pay its own gas. A plain transfer costs far less,
 * but reusing the familiar 0.05 figure keeps the UI story simple.
 */
export const SWEEP_GAS_RESERVE_WEI = parseUnits("0.05", 18);

export type SweepResult =
  | { ok: true; txHash: `0x${string}`; amountWei: bigint }
  | { ok: false; reason: "rpc_unreachable" }
  | { ok: false; reason: "nothing_to_sweep"; balanceWei: bigint }
  | { ok: false; reason: "insufficient"; balanceWei: bigint; maxWei: bigint }
  | { ok: false; reason: "send_failed" }
  | { ok: false; reason: "receipt_unavailable" }
  | { ok: false; reason: "unconfirmed"; txHash: `0x${string}` };

/**
 * The one place that decides how much a send out of a custodial wallet may
 * move: the gas reserve always stays behind, "max" means everything above
 * it, and an explicit request must fit under that same ceiling. Pure so the
 * boundary cases are unit-testable without a chain.
 */
export function decideSendAmount(
  balanceWei: bigint,
  requested: bigint | "max",
): { ok: true; amountWei: bigint } | { ok: false; maxWei: bigint } {
  const maxWei =
    balanceWei > SWEEP_GAS_RESERVE_WEI ? balanceWei - SWEEP_GAS_RESERVE_WEI : 0n;
  if (requested === "max") {
    return maxWei > 0n ? { ok: true, amountWei: maxWei } : { ok: false, maxWei };
  }
  return requested > 0n && requested <= maxWei
    ? { ok: true, amountWei: requested }
    : { ok: false, maxWei };
}

/**
 * Write (or revive) the "sending" receipt row for a sweep transaction.
 * Identical signed bytes produce the identical hash, so a retried sweep can
 * meet its own earlier receipt: that existing row IS the durable record.
 * On conflict we only make sure it is back in "sending" so the reconciler
 * watches it again - unless it already settled as confirmed, which must
 * never be downgraded. Exported for the receipt-durability tests.
 */
export async function upsertSendingReceipt(
  ownerId: string,
  amountWei: bigint,
  to: Address,
  txHash: `0x${string}`,
): Promise<void> {
  const inserted = await db
    .insert(walletTransfersTable)
    .values({
      userId: ownerId,
      amountWei: amountWei.toString(),
      toAddress: to,
      txHash,
      status: "sending",
    })
    .onConflictDoNothing({ target: walletTransfersTable.txHash });
  if ((inserted.rowCount ?? 0) === 0) {
    await db
      .update(walletTransfersTable)
      // Refreshing last_attempt_at (DB clock, microsecond precision) starts
      // a new attempt "version": any reconciler still holding the previous
      // timestamp can no longer settle this row.
      .set({ status: "sending", lastAttemptAt: sql`now()` })
      .where(
        and(
          eq(walletTransfersTable.txHash, txHash),
          ne(walletTransfersTable.status, "confirmed"),
        ),
      );
  }
}

/**
 * Settle a "sending" receipt to its decided state, but ONLY if the row is
 * exactly as the caller observed it: still "sending" and still the same
 * attempt (last_attempt_at unchanged). Chain checks take time; if a
 * concurrent sweep confirmed the row meanwhile, or a retry revived it into a
 * new attempt, this stale observation must change nothing. A no-op here is
 * always safe: the next receipts read re-observes and re-decides, and a
 * transaction the chain confirmed stays confirmable forever.
 */
export async function settleReceiptIfUnchanged(
  id: string,
  observedLastAttemptAt: Date,
  settled: "confirmed" | "failed",
): Promise<void> {
  await db
    .update(walletTransfersTable)
    .set({ status: settled })
    .where(
      and(
        eq(walletTransfersTable.id, id),
        eq(walletTransfersTable.status, "sending"),
        eq(walletTransfersTable.lastAttemptAt, observedLastAttemptAt),
      ),
    );
}

/** Retry a DB write a few times - receipts must survive transient hiccups. */
async function persistently<T>(label: string, write: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (const delayMs of [0, 250, 1_000]) {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    try {
      return await write();
    } catch (err) {
      lastErr = err;
      logger.warn({ err, label }, "Receipt write failed, retrying");
    }
  }
  throw lastErr;
}

/**
 * What the chain itself says about a transaction. Used to settle receipt
 * rows that a crash or slow confirmation left in "sending": the tx hash is
 * proof, so nothing is ever guessed. "notfound" means the chain has never
 * seen the hash (mined receipts do not disappear); "unreachable" means we
 * could not ask - in doubt, decide nothing.
 */
export async function checkTxOutcome(
  txHash: `0x${string}`,
): Promise<"confirmed" | "reverted" | "notfound" | "unreachable"> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    return receipt.status === "success" ? "confirmed" : "reverted";
  } catch (err) {
    return err instanceof TransactionReceiptNotFoundError
      ? "notfound"
      : "unreachable";
  }
}

/**
 * Move everything above the gas reserve from a custodial wallet to `to` as a
 * plain native transfer - the linked-payout-wallet flow.
 */
export async function sweepWalletBalance(
  ownerId: string,
  to: Address,
): Promise<SweepResult> {
  return sendWalletFunds(ownerId, to, "max");
}

/**
 * Send funds from a custodial wallet to `to` as a plain native transfer -
 * either everything above the gas reserve ("max") or an exact requested
 * amount that must fit under the same reserve rule. The balance is read
 * fresh inside the serialized tx queue, so money that landed a moment
 * earlier is included and two concurrent sends can never double-spend.
 * Expected obstacles come back as honest `ok: false` reasons for the route
 * to explain in plain language; nothing is ever faked.
 */
export async function sendWalletFunds(
  ownerId: string,
  to: Address,
  requested: bigint | "max",
): Promise<SweepResult> {
  const row = await getWallet(ownerId);
  if (!row) throw new Error(`No custodial wallet exists for ${ownerId}`);
  const wallet = walletClientFor(row.privateKey, ARC_TESTNET);
  return enqueueTx<SweepResult>(ARC_TESTNET, async () => {
    const balance = await getBalance(row.address);
    if (balance === null) return { ok: false, reason: "rpc_unreachable" };
    const decision = decideSendAmount(balance, requested);
    if (!decision.ok) {
      return requested === "max"
        ? { ok: false, reason: "nothing_to_sweep", balanceWei: balance }
        : {
            ok: false,
            reason: "insufficient",
            balanceWei: balance,
            maxWei: decision.maxWei,
          };
    }
    const amountWei = decision.amountWei;
    // Sign locally FIRST. The signed bytes determine the transaction hash,
    // so the receipt row can exist durably BEFORE anything reaches the
    // network - a crash at any later point leaves a row the reconciler can
    // settle from the chain. Money never moves without its receipt.
    let serialized: `0x${string}`;
    try {
      const request = await wallet.prepareTransactionRequest({
        to,
        value: amountWei,
      });
      serialized = await wallet.signTransaction(request);
    } catch (err) {
      logger.warn(
        { err, ownerId, to },
        "Balance sweep could not be prepared and signed - nothing was sent",
      );
      return { ok: false, reason: "send_failed" };
    }
    const txHash = keccak256(serialized);
    try {
      await persistently(`sweep receipt ${txHash}`, () =>
        upsertSendingReceipt(ownerId, amountWei, to, txHash),
      );
    } catch (err) {
      // No durable receipt possible right now -> refuse to move the money.
      logger.error(
        { err, ownerId, to, txHash },
        "Receipt row could not be written - sweep aborted before broadcast",
      );
      return { ok: false, reason: "receipt_unavailable" };
    }
    try {
      const broadcastHash = await wallet.sendRawTransaction({
        serializedTransaction: serialized,
      });
      if (broadcastHash !== txHash) {
        // Cannot happen for a correctly serialized tx; log it if it ever does.
        logger.error(
          { broadcastHash, txHash },
          "Broadcast hash differs from the precomputed hash",
        );
      }
    } catch (err) {
      // An error here is AMBIGUOUS: a timeout or dropped connection can
      // happen AFTER the node accepted the transaction, so claiming "nothing
      // moved" would be a lie. Leave the receipt in "sending" and report the
      // uncertain outcome with the hash; the reconciler settles the row from
      // the chain either way (confirmed if it landed, failed once the hash
      // stays unseen past the never-broadcast window).
      logger.warn(
        { err, ownerId, to, txHash },
        "Balance sweep broadcast outcome unknown - receipt left in sending",
      );
      return { ok: false, reason: "unconfirmed", txHash };
    }
    try {
      await waitForSuccess(ARC_TESTNET, txHash, "Balance sweep");
    } catch (err) {
      logger.warn(
        { err, ownerId, to, txHash },
        "Balance sweep sent but not confirmed in time",
      );
      // Leave the receipt in "sending": the reconciler on the receipts list
      // settles it from the chain once the outcome is knowable.
      return { ok: false, reason: "unconfirmed", txHash };
    }
    try {
      await persistently(`sweep receipt confirm ${txHash}`, () =>
        db
          .update(walletTransfersTable)
          .set({ status: "confirmed" })
          .where(eq(walletTransfersTable.txHash, txHash)),
      );
    } catch (err) {
      // Still "sending" in the DB; the reconciler will confirm it from the
      // chain on the next receipts read. The transfer itself succeeded.
      logger.error(
        { err, ownerId, to, txHash },
        "Sweep confirmed on chain but its receipt row could not be updated",
      );
    }
    logger.info(
      { ownerId, to, txHash, amountUsdc: formatUsdc(amountWei) },
      "Sent funds out of custodial wallet",
    );
    return { ok: true, txHash, amountWei };
  });
}

// ------------------------------------------------------------- anchoring

async function loadInvoice(invoiceId: string): Promise<InvoiceRow | null> {
  const [row] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId));
  return row ?? null;
}

async function resolveInvoice(
  invoice: string | InvoiceRow,
): Promise<InvoiceRow | null> {
  return typeof invoice === "string" ? loadInvoice(invoice) : invoice;
}

export type AnchorReadResult =
  | { reachable: false }
  | {
      reachable: true;
      anchored: boolean;
      fingerprint: string | null;
      paid: boolean;
      paidAmountWei: bigint;
      payer: Address | null;
      payee: Address | null;
    };

const NOT_ANCHORED: AnchorReadResult = {
  reachable: true,
  anchored: false,
  fingerprint: null,
  paid: false,
  paidAmountWei: 0n,
  payer: null,
  payee: null,
};

/**
 * Read the public anchor record for an invoice straight from the contract on
 * the invoice's own network. An invoice anchored on an earlier registry keeps
 * verifying against THAT contract: its pinned address wins over the current
 * one. getAnchor has the same shape in v3 and v4, so one reader serves both.
 */
export async function readAnchor(
  invoice: string | InvoiceRow,
): Promise<AnchorReadResult> {
  const row = await resolveInvoice(invoice);
  if (!row) return NOT_ANCHORED;
  const registry = registryFor(row);
  const address =
    registry.address ??
    (registry.network.mode === "sandbox" ? await getLegacyContractAddress() : null);
  if (!address) return NOT_ANCHORED;
  try {
    const result = (await registry.network.publicClient.readContract({
      address,
      abi: REGISTRY_ABI,
      functionName: "getAnchor",
      args: [invoiceKey(row.id)],
    })) as readonly [Hex, bigint, boolean, bigint, Address, Address];
    const [fingerprint, anchoredAt, paid, paidAmount, payer, payee] = result;
    if (anchoredAt === 0n) return NOT_ANCHORED;
    return {
      reachable: true,
      anchored: true,
      fingerprint: fingerprint.slice(2),
      paid,
      paidAmountWei: paidAmount,
      payer: paid ? payer : null,
      payee: paid ? payee : null,
    };
  } catch {
    return { reachable: false };
  }
}

/** Exact, case-insensitive comparison for the 32-byte fingerprint onchain. */
export function anchorFingerprintMatches(
  actual: string | null,
  expected: string,
): boolean {
  return actual !== null && actual.toLowerCase() === expected.toLowerCase();
}

/** Who signs (and pays for) anchors on a network. */
export type AnchorPayer = "sender" | "operator";

export function anchorPayerFor(network: ArcNetwork): AnchorPayer {
  return network.mode === "live" ? "operator" : "sender";
}

/**
 * Live cost of one anchor transaction (gas x current gas price), estimated
 * against the real registry with a throwaway fingerprint from the address
 * that will actually submit it: the sender's sandbox wallet, or the operator
 * on mainnet (the mainnet registry rejects anyone else, so estimating from
 * another address would just revert). Sandbox falls back to the permanent
 * 0.1 test-USDC figure; live returns null when no honest estimate exists.
 */
export async function estimateAnchorFeeWei(
  network: ArcNetwork,
  fromAddress: string,
): Promise<bigint | null> {
  const registry = network.registryAddress;
  if (!registry) return feeFallbackFor(network);
  try {
    const probe = keccak256(
      toBytes(`anchor-fee-probe:${Date.now()}:${Math.random()}`),
    );
    const [gas, gasPrice] = await Promise.all([
      network.publicClient.estimateContractGas({
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "anchorInvoice",
        args: [probe, probe, probe],
        account: fromAddress as Address,
      }),
      network.publicClient.getGasPrice(),
    ]);
    return gas * gasPrice;
  } catch {
    return feeFallbackFor(network);
  }
}

/** The mainnet operator wallet: address and live balance, or null when off. */
export async function mainnetOperatorStatus(): Promise<{
  address: Address;
  balanceWei: bigint | null;
} | null> {
  const operator = mainnetOperatorAccount();
  if (!operator) return null;
  return {
    address: operator.address,
    balanceWei: await getBalance(operator.address, ARC_MAINNET),
  };
}

/**
 * The address a payment for this invoice must reach. Live invoices pay the
 * sender's own linked wallet - there is no custodial fallback with real
 * money, so a sender without a payout wallet cannot create one. Sandbox
 * invoices pay the linked wallet when there is one, else the sender's
 * custodial sandbox wallet.
 */
export async function resolvePayeeForNetwork(
  payeeUserId: string,
  network: ArcNetwork,
): Promise<{ address: Address; linked: boolean } | null> {
  const [payeeRow] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payeeUserId));
  if (payeeRow?.payoutAddress) {
    return { address: payeeRow.payoutAddress as Address, linked: true };
  }
  if (network.mode === "live") return null;
  const wallet = await getWallet(payeeUserId);
  return wallet ? { address: wallet.address as Address, linked: false } : null;
}

/**
 * Sandbox-only view used by legacy (v3) previews: where a payment to this
 * payee would land right now. v4 invoices carry their payee on the row.
 */
export async function resolvePayeeAddress(
  payeeUserId: string,
): Promise<{ address: string; linked: boolean } | null> {
  return resolvePayeeForNetwork(payeeUserId, ARC_TESTNET);
}

export interface PaymentTerms {
  payee: Address;
  salt: Hex;
  amountWei: bigint;
}

export function paymentTermsOf(invoice: InvoiceRow): PaymentTerms | null {
  if (!invoice.payeeAddress || !isBytes32Hex(invoice.paymentSalt)) return null;
  return {
    payee: invoice.payeeAddress as Address,
    salt: invoice.paymentSalt,
    amountWei: parseUnits(fmt2(invoice.amountUsdc), 18),
  };
}

/**
 * Fix the payment terms (payee + salt) an anchor commits to. Written once,
 * first writer wins, never overwritten: the on-chain commitment must keep
 * matching the row forever. Invoices created before v4 get their terms here
 * on their first v4 anchor attempt.
 */
export async function ensurePaymentTerms(
  invoice: InvoiceRow,
): Promise<PaymentTerms | null> {
  const existing = paymentTermsOf(invoice);
  if (existing) return existing;
  const network = networkForChainId(invoice.chainId);
  const payee = await resolvePayeeForNetwork(invoice.freelancerId, network);
  if (!payee) return null;
  const salt = newPaymentSalt();
  await db
    .update(invoicesTable)
    .set({
      payeeAddress: sql`COALESCE(${invoicesTable.payeeAddress}, ${payee.address})`,
      paymentSalt: sql`COALESCE(${invoicesTable.paymentSalt}, ${salt})`,
    })
    .where(eq(invoicesTable.id, invoice.id));
  const fresh = await loadInvoice(invoice.id);
  return fresh ? paymentTermsOf(fresh) : null;
}

/** The wallet that signs this invoice's anchor, or null when it cannot. */
async function anchorSignerFor(
  invoice: InvoiceRow,
  network: ArcNetwork,
): Promise<PrivateKeyAccount | null> {
  if (network.mode === "live") {
    // The switch is checked on every signature, not just at creation: turning
    // mainnet off must also stop the background retry from spending.
    return mainnetAvailability().enabled ? mainnetOperatorAccount() : null;
  }
  const sender = await getWallet(invoice.freelancerId);
  return sender ? privateKeyToAccount(sender.privateKey as Hex) : null;
}

/** Who signed a persisted transaction and which contract it targets. */
async function signedTransactionParties(
  transaction: PendingSignedTransaction,
): Promise<{ from: Address; to: Address | null }> {
  const serialized = transaction.serialized as TransactionSerialized;
  const parsed = parseTransaction(serialized);
  const from = await recoverTransactionAddress({
    serializedTransaction: serialized,
  });
  return { from, to: parsed.to ?? null };
}

async function minedReceipt(network: ArcNetwork, hash: Hex) {
  try {
    return await network.publicClient.getTransactionReceipt({ hash });
  } catch (err) {
    if (err instanceof TransactionReceiptNotFoundError) return null;
    throw err;
  }
}

/**
 * Record the invoice fingerprint and payment commitment onchain. Sandbox
 * anchors are signed and paid by the sender's custodial wallet; live anchors
 * by Envelo's operator key. Failures leave the invoice pending (or
 * unavailable when the network is down) - never silently faked.
 */
export async function anchorInvoiceOnChain(invoiceId: string): Promise<boolean> {
  const invoice = await loadInvoice(invoiceId);
  if (!invoice) return false;
  if (invoice.anchorStatus === "anchored") {
    const existing = await readAnchor(invoice);
    const matches =
      existing.reachable &&
      existing.anchored &&
      anchorFingerprintMatches(existing.fingerprint, invoice.fingerprint);
    if (matches) {
      await clearPendingSignedTransaction("anchor", invoiceId);
    }
    return matches;
  }

  const { network, address: registry } = registryFor(invoice);
  if (!registry) {
    logger.error(
      { invoiceId, network: network.key },
      "No registry configured for this network; anchor stays pending",
    );
    return false;
  }
  const signer = await anchorSignerFor(invoice, network);
  if (!signer) {
    const live = mainnetAvailability();
    logger.warn(
      {
        invoiceId,
        network: network.key,
        reason: network.mode === "live" && !live.enabled ? live.reason : "no_sender_wallet",
      },
      network.mode === "live"
        ? "Mainnet is switched off or has no operator key; anchor stays pending"
        : "Sender has no sandbox wallet; anchor stays pending",
    );
    return false;
  }
  const terms = await ensurePaymentTerms(invoice);
  if (!terms) {
    logger.warn(
      { invoiceId, network: network.key },
      "Invoice has no payee wallet yet (live invoices need a linked payout wallet); anchor stays pending",
    );
    return false;
  }

  try {
    const wallet = walletClientForAccount(signer, network);
    const result = await enqueueTx(network, async (): Promise<
      | { confirmed: false }
      | {
          confirmed: true;
          hash: string | null;
          block: bigint | null;
          /** Set when the anchor landed on a registry other than the current one. */
          contractAddress?: Address;
        }
    > => {
      // Re-check inside the queue: another queued attempt (creation hook,
      // retry pass, pay route) may have anchored this invoice meanwhile, and
      // a second anchor tx would just revert in the contract.
      const fresh = await loadInvoice(invoiceId);
      if (!fresh) throw new Error("Invoice disappeared while anchoring");
      if (fresh.anchorStatus === "anchored") {
        const existing = await readAnchor(fresh);
        if (
          !existing.reachable ||
          !existing.anchored ||
          !anchorFingerprintMatches(existing.fingerprint, fresh.fingerprint)
        ) {
          throw new Error("Stored anchor does not match the invoice fingerprint");
        }
        return { confirmed: true, hash: fresh.anchorTxHash, block: fresh.anchorBlock };
      }

      const confirmAnchored = async (): Promise<boolean> => {
        const confirmed = await readAnchor(fresh);
        return (
          confirmed.reachable &&
          confirmed.anchored &&
          anchorFingerprintMatches(confirmed.fingerprint, fresh.fingerprint)
        );
      };

      // Signed bytes are persisted before their first broadcast. Replaying the
      // exact bytes is safe: same sender, nonce, payload, signature, and hash.
      const pending = await getPendingSignedTransaction("anchor", invoiceId);
      if (pending) {
        if (fresh.anchorTxHash && fresh.anchorTxHash !== pending.hash) {
          throw new Error("Stored anchor hash does not match its signed intent");
        }
        // An intent signed before an operator or registry rotation still
        // carries the old key and the old contract. Never rebroadcast it as
        // if nothing changed: a revoked key must not keep spending, and an
        // anchor on the previous registry must be pinned there, not here.
        const parties = await signedTransactionParties(pending);
        const stillCurrent =
          parties.from.toLowerCase() === signer.address.toLowerCase() &&
          parties.to?.toLowerCase() === registry.toLowerCase();
        if (stillCurrent) {
          const receipt = await submitSignedTransaction(network, pending, "Anchor");
          if (!(await confirmAnchored())) return { confirmed: false };
          return { confirmed: true, hash: pending.hash, block: receipt.blockNumber };
        }
        const mined = await minedReceipt(network, pending.hash);
        if (mined?.status === "success" && parties.to) {
          const there = await readAnchor({
            ...fresh,
            contractAddress: parties.to,
            registryVersion: REGISTRY_VERSION,
          });
          if (!there.reachable) return { confirmed: false };
          if (
            !there.anchored ||
            !anchorFingerprintMatches(there.fingerprint, fresh.fingerprint)
          ) {
            throw new Error(
              "A stale anchor transaction was mined but its registry does not hold this fingerprint",
            );
          }
          return {
            confirmed: true,
            hash: pending.hash,
            block: mined.blockNumber,
            contractAddress: parties.to,
          };
        }
        logger.warn(
          { invoiceId, network: network.key, signedBy: parties.from, target: parties.to },
          "Discarding a signed anchor left over from an operator or registry rotation",
        );
        await clearPendingSignedTransaction("anchor", invoiceId);
        await db
          .update(invoicesTable)
          .set({ anchorTxHash: null })
          .where(eq(invoicesTable.id, invoiceId));
        fresh.anchorTxHash = null;
      }

      // Legacy submitted hashes have no persisted signed bytes. They are
      // reconcile-only forever: a missing receipt never causes a replacement
      // transaction or a second charge.
      if (fresh.anchorTxHash) {
        try {
          const receipt = await network.publicClient.getTransactionReceipt({
            hash: fresh.anchorTxHash as Hex,
          });
          if (receipt.status !== "success") {
            throw new Error(
              `Anchor transaction ${fresh.anchorTxHash} was mined but reverted`,
            );
          }
          const confirmed = await readAnchor(fresh);
          if (!confirmed.reachable) return { confirmed: false };
          if (
            !confirmed.anchored ||
            !anchorFingerprintMatches(confirmed.fingerprint, fresh.fingerprint)
          ) {
            throw new Error(
              "Confirmed anchor transaction does not match the invoice fingerprint",
            );
          }
          return {
            confirmed: true,
            hash: fresh.anchorTxHash,
            block: receipt.blockNumber,
          };
        } catch (err) {
          if (err instanceof TransactionReceiptNotFoundError) {
            logger.info(
              { invoiceId, txHash: fresh.anchorTxHash },
              "Anchor transaction is still awaiting a receipt; not resubmitting",
            );
            return { confirmed: false };
          }
          throw err;
        }
      }

      // The contract may already hold this anchor (a confirmation the app
      // missed). Never send a second transaction for it.
      const existing = await readAnchor(fresh);
      if (existing.reachable && existing.anchored) {
        if (!anchorFingerprintMatches(existing.fingerprint, fresh.fingerprint)) {
          throw new Error(
            "Registry contains a different fingerprint for this invoice",
          );
        }
        return { confirmed: true, hash: null, block: null };
      }

      if (network.mode === "live") {
        // Real money: refuse to sign when the operator cannot clearly cover
        // the gas, instead of letting the node reject an underfunded tx.
        const [balance, fee] = await Promise.all([
          getBalance(signer.address, network),
          estimateAnchorFeeWei(network, signer.address),
        ]);
        if (balance === null || fee === null) {
          throw new Error("Mainnet operator balance or anchor fee is unreadable");
        }
        if (!decideAffordability(balance, fee).canAfford) {
          throw new Error(
            `Mainnet operator wallet ${signer.address} holds ${formatFeeUsdc(balance)} USDC, below the ${formatFeeUsdc(fee)} USDC anchor fee`,
          );
        }
        // The same floor the approval sheet enforces, re-checked at the moment
        // of signing: the balance may have dropped since the invoice was made.
        const floorWei = parseUnits(mainnetOperatorMinBalanceUsdc(), 18);
        if (balance < floorWei) {
          throw new Error(
            `Mainnet operator wallet ${signer.address} holds ${formatFeeUsdc(balance)} USDC, under its ${mainnetOperatorMinBalanceUsdc()} USDC floor`,
          );
        }
      }

      const commitment = paymentCommitment({
        invoiceId,
        payee: terms.payee,
        amountWei: terms.amountWei,
        salt: terms.salt,
      });
      const data = encodeAnchorCall({
        invoiceId,
        fingerprintHex: fresh.fingerprint,
        commitment,
      });
      const signed = await signTransactionBeforeBroadcast(wallet, {
        to: registry,
        data,
      });
      const transaction: PendingSignedTransaction = {
        hash: signed.hash,
        serialized: signed.serialized,
      };
      await persistSignedTransaction("anchor", invoiceId, transaction);
      const receipt = await submitSignedTransaction(network, transaction, "Anchor");
      if (!(await confirmAnchored())) return { confirmed: false };
      const recorded = (await network.publicClient.readContract({
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "getCommitment",
        args: [invoiceKey(invoiceId)],
      })) as Hex;
      if (recorded.toLowerCase() !== commitment.toLowerCase()) {
        throw new Error(
          "Registry recorded a different payment commitment for this invoice",
        );
      }
      return { confirmed: true, hash: signed.hash, block: receipt.blockNumber };
    });
    if (!result.confirmed) return false;
    await markAnchored({
      invoiceId,
      txHash: result.hash,
      contractAddress: result.contractAddress ?? registry,
      registryVersion: REGISTRY_VERSION,
      block: result.block,
      network,
    });
    await clearPendingSignedTransaction("anchor", invoiceId);
    logger.info(
      {
        invoiceId,
        txHash: result.hash,
        contractAddress: registry,
        network: network.key,
        paidBy: anchorPayerFor(network),
      },
      "Invoice fingerprint anchored on Arc",
    );
    return true;
  } catch (err) {
    const connected = await isRpcConnected(network);
    await db
      .update(invoicesTable)
      .set({ anchorStatus: connected ? "pending" : "unavailable" })
      .where(eq(invoicesTable.id, invoiceId));
    logger.warn(
      { err, invoiceId, network: network.key, connected },
      "Anchoring failed; will retry",
    );
    return false;
  }
}

async function markAnchored(args: {
  invoiceId: string;
  txHash: string | null;
  contractAddress: Address;
  registryVersion: number;
  block: bigint | null;
  network: ArcNetwork;
}): Promise<void> {
  await db
    .update(invoicesTable)
    .set({
      anchorStatus: "anchored",
      anchorTxHash: args.txHash,
      // Pin which contract (and version) holds this anchor - but never
      // overwrite an existing pin (an early-return re-mark must not repoint
      // an invoice anchored on an older contract version at the current one).
      contractAddress: sql`COALESCE(${invoicesTable.contractAddress}, ${args.contractAddress})`,
      registryVersion: sql`COALESCE(${invoicesTable.registryVersion}, ${args.registryVersion})`,
      anchorBlock: sql`COALESCE(${invoicesTable.anchorBlock}, ${args.block === null ? null : args.block.toString()}::bigint)`,
    })
    .where(eq(invoicesTable.id, args.invoiceId));
  const events = await db
    .select()
    .from(invoiceEventsTable)
    .where(
      and(
        eq(invoiceEventsTable.invoiceId, args.invoiceId),
        eq(invoiceEventsTable.kind, "anchored"),
      ),
    );
  if (events.length === 0) {
    await db.insert(invoiceEventsTable).values({
      invoiceId: args.invoiceId,
      kind: "anchored",
      detail: `The invoice fingerprint and a hash of its payment terms (and nothing else) were recorded on ${args.network.name}${
        args.network.mode === "live" ? " by Envelo's operator wallet" : ""
      }.`,
      txHash: args.txHash,
    });
  }
}

export async function retryPendingAnchors(): Promise<void> {
  const rows = await db
    .select()
    .from(invoicesTable)
    .where(ne(invoicesTable.anchorStatus, "anchored"));
  if (rows.length === 0) return;
  // Probe each network once per pass; a down network's invoices just wait.
  const reachable = new Map<number, boolean>();
  for (const row of rows) {
    const network = networkForChainId(row.chainId);
    if (network.mode === "live" && !mainnetAvailability().enabled) continue;
    if (!reachable.has(network.chainId)) {
      reachable.set(network.chainId, await isRpcConnected(network));
    }
    if (!reachable.get(network.chainId)) continue;
    await anchorInvoiceOnChain(row.id);
  }
}

// ------------------------------------------------------------ pay preview

/**
 * Live cost of one payInvoice transaction for this invoice, simulated from
 * the payer's own address (a node refuses to simulate a payment the payer
 * cannot cover). Sandbox falls back to the permanent 0.1 test-USDC figure;
 * live returns null when no honest estimate exists.
 */
export async function estimatePayFeeWei(args: {
  invoice: InvoiceRow;
  payerAddress: string;
  payeeAddress: string;
  amountWei: bigint;
}): Promise<bigint | null> {
  const registry = registryFor(args.invoice);
  if (!registry.address) return feeFallbackFor(registry.network);
  try {
    const client = registry.network.publicClient;
    const terms = paymentTermsOf(args.invoice);
    const gasPromise =
      registry.version >= 4 && terms
        ? client.estimateContractGas({
            address: registry.address,
            abi: REGISTRY_ABI,
            functionName: "payInvoice",
            args: [invoiceKey(args.invoice.id), terms.payee, terms.salt],
            account: args.payerAddress as Address,
            value: args.amountWei,
          })
        : client.estimateGas({
            account: args.payerAddress as Address,
            to: registry.address,
            data: encodePayCallV3({
              invoiceId: args.invoice.id,
              payee: args.payeeAddress as Address,
            }),
            value: args.amountWei,
          });
    const [gas, gasPrice] = await Promise.all([gasPromise, client.getGasPrice()]);
    return gas * gasPrice;
  } catch {
    return feeFallbackFor(registry.network);
  }
}

export interface ExternalPaymentRequest {
  chainId: number;
  to: Address;
  data: Hex;
  /** Native USDC wei, hex encoded the way eth_sendTransaction expects. */
  value: Hex;
  valueWei: bigint;
}

/**
 * The exact transaction a client's own wallet must send to pay this invoice:
 * payInvoice(key, committed payee, salt) on the invoice's registry with the
 * invoice amount attached. Null until the invoice is anchored on a v4
 * registry with its terms fixed - an unanchored invoice cannot be paid.
 */
export function buildExternalPayment(
  invoice: InvoiceRow,
): ExternalPaymentRequest | null {
  if (invoice.anchorStatus !== "anchored") return null;
  const registry = registryFor(invoice);
  const terms = paymentTermsOf(invoice);
  if (!registry.address || registry.version < 4 || !terms) return null;
  return {
    chainId: registry.network.chainId,
    to: registry.address,
    data: encodePayCall({ invoiceId: invoice.id, payee: terms.payee, salt: terms.salt }),
    value: `0x${terms.amountWei.toString(16)}`,
    valueWei: terms.amountWei,
  };
}

// -------------------------------------------------------------- payments

/**
 * Mark an invoice paid from a verified on-chain fact. Idempotent: the row is
 * only moved to paid once and the "paid" event is written once, so the
 * custodial path, the browser-wallet path and reconciliation can all call it.
 */
export async function recordInvoicePaid(args: {
  invoiceId: string;
  txHash: string | null;
  payerAddress: Address | null;
  actorId: string | null;
  detail: string;
}): Promise<InvoiceRow | null> {
  // One conditional update decides the winner: Postgres re-checks the
  // status predicate after taking the row lock, so of several concurrent
  // callers (custodial pay, wallet pay, reconciliation) exactly one sees a
  // row come back and writes the single "paid" event.
  const [won] = await db
    .update(invoicesTable)
    .set({
      status: "paid",
      payTxHash: sql`COALESCE(${args.txHash}, ${invoicesTable.payTxHash})`,
      payerAddress: sql`COALESCE(${args.payerAddress}, ${invoicesTable.payerAddress})`,
      paidAt: sql`COALESCE(${invoicesTable.paidAt}, now())`,
    })
    .where(
      and(eq(invoicesTable.id, args.invoiceId), ne(invoicesTable.status, "paid")),
    )
    .returning();
  if (won) {
    await db.insert(invoiceEventsTable).values({
      invoiceId: args.invoiceId,
      kind: "paid",
      actorId: args.actorId,
      detail: args.detail,
      txHash: args.txHash ?? won.payTxHash ?? null,
    });
    return won;
  }
  const [current] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, args.invoiceId));
  return current ?? null;
}

/**
 * Send the real payment transaction from the payer's SANDBOX wallet. The
 * registry contract forwards the attached native USDC to the payee. Live
 * invoices never come through here: they are paid from the client's own
 * wallet and verified by confirmExternalPayment.
 */
export async function payInvoiceOnChain(args: {
  invoiceId: string;
  payerWalletId: string;
  /** Also the payee's user id - custodial wallets share the user's id. */
  payeeWalletId: string;
  amountUsdc: string;
}): Promise<{
  txHash: string | null;
  alreadyPaidOnChain: boolean;
  paidToLinkedWallet: boolean;
  payerAddress: Address | null;
}> {
  const invRow = await loadInvoice(args.invoiceId);
  if (!invRow) throw new Error("Invoice not found");
  // Pay on the contract this invoice is actually anchored on (older
  // invoices stay on the contract version that recorded them).
  const registry = registryFor(invRow);
  const { network } = registry;
  if (network.mode === "live") {
    throw new Error("Live invoices are paid from the client's own wallet");
  }
  const contractAddress = registry.address ?? (await getLegacyContractAddress());
  if (!contractAddress) throw new Error("Registry contract not deployed yet");
  const payer = await getWallet(args.payerWalletId);
  if (!payer) throw new Error("Custodial wallet missing");
  const wallet = walletClientFor(payer.privateKey, network);
  const amountWei = parseUnits(args.amountUsdc, 18);

  // Once a receipt is in hand, the event is the proof (v4); v3 has no
  // commitment, so its paid flag is all there is.
  const verifyPaid = async (
    receiptLogs: readonly { address: Address; data: Hex; topics: readonly Hex[] }[] | null,
    terms: PaymentTerms | null,
  ): Promise<InvoicePaidEvent | null> => {
    if (receiptLogs && terms) {
      const event = findInvoicePaidLog(
        receiptLogs as Parameters<typeof findInvoicePaidLog>[0],
        contractAddress,
        args.invoiceId,
      );
      if (!event || !paymentSettlesInvoice(event, terms)) {
        throw new Error(
          "Payment receipt has no matching InvoicePaid event from the registry",
        );
      }
      return event;
    }
    const confirmed = await readAnchor(invRow);
    if (!confirmed.reachable || !confirmed.anchored || !confirmed.paid) {
      throw new Error("Payment receipt succeeded but Arc does not report it paid");
    }
    return null;
  };

  return enqueueTx(network, async () => {
    // The contract is the source of truth: if an earlier attempt's receipt
    // timed out but the transaction landed, never pay a second time.
    const anchor = await readAnchor(invRow);
    if (
      !anchor.reachable ||
      !anchor.anchored ||
      !anchorFingerprintMatches(anchor.fingerprint, invRow.fingerprint)
    ) {
      throw new Error(
        "Invoice payment blocked: the onchain fingerprint is missing or does not match",
      );
    }
    if (anchor.paid) {
      await clearPendingSignedTransaction("payment", args.invoiceId);
      return {
        txHash: invRow.payTxHash,
        alreadyPaidOnChain: true,
        paidToLinkedWallet: false,
        payerAddress: anchor.payer,
      };
    }

    const terms = registry.version >= 4 ? paymentTermsOf(invRow) : null;
    if (registry.version >= 4 && !terms) {
      throw new Error("Invoice is anchored on v4 but has no payment terms");
    }

    const pending = await getPendingSignedTransaction("payment", args.invoiceId);
    if (pending) {
      if (invRow.payTxHash && invRow.payTxHash !== pending.hash) {
        throw new Error("Stored payment hash does not match its signed intent");
      }
      const receipt = await submitSignedTransaction(network, pending, "Payment");
      await verifyPaid(receipt.logs, terms);
      await clearPendingSignedTransaction("payment", args.invoiceId);
      return {
        txHash: pending.hash,
        alreadyPaidOnChain: false,
        paidToLinkedWallet: pending.paidToLinkedWallet === true,
        payerAddress: payer.address as Address,
      };
    }

    // A legacy submitted hash without signed bytes is reconcile-only. Never
    // create a replacement payment that could charge gas twice.
    if (invRow.payTxHash) {
      try {
        const receipt = await network.publicClient.getTransactionReceipt({
          hash: invRow.payTxHash as Hex,
        });
        if (receipt.status !== "success") {
          throw new Error(
            `Payment transaction ${invRow.payTxHash} was mined but reverted`,
          );
        }
        await verifyPaid(receipt.logs, terms);
        return {
          txHash: invRow.payTxHash,
          alreadyPaidOnChain: false,
          paidToLinkedWallet: false,
          payerAddress: payer.address as Address,
        };
      } catch (err) {
        if (err instanceof TransactionReceiptNotFoundError) {
          throw new Error(
            `Payment ${invRow.payTxHash} is still awaiting an Arc receipt; it was not resubmitted`,
          );
        }
        throw err;
      }
    }

    let data: Hex;
    let paidToLinkedWallet: boolean;
    if (terms) {
      // v4: the payee was fixed at anchor time and is part of the on-chain
      // commitment; the contract rejects any other destination.
      data = encodePayCall({
        invoiceId: args.invoiceId,
        payee: terms.payee,
        salt: terms.salt,
      });
      const [payeeRow] = await db
        .select({ payoutAddress: usersTable.payoutAddress })
        .from(usersTable)
        .where(eq(usersTable.id, args.payeeWalletId));
      paidToLinkedWallet =
        payeeRow?.payoutAddress?.toLowerCase() === terms.payee.toLowerCase();
      if (terms.amountWei !== amountWei) {
        throw new Error("Invoice amount does not match its committed payment terms");
      }
    } else {
      // v3 (legacy sandbox anchors): resolve where the money goes at the
      // LAST moment, inside the serialized queue, so a last-second payout
      // wallet change is honoured.
      const payee = await resolvePayeeForNetwork(args.payeeWalletId, network);
      if (!payee) throw new Error("Custodial wallet missing");
      data = encodePayCallV3({ invoiceId: args.invoiceId, payee: payee.address });
      paidToLinkedWallet = payee.linked;
    }
    const signed = await signTransactionBeforeBroadcast(wallet, {
      to: contractAddress,
      data,
      value: amountWei,
    });
    const transaction: PendingSignedTransaction = {
      hash: signed.hash,
      serialized: signed.serialized,
      paidToLinkedWallet,
    };
    await persistSignedTransaction("payment", args.invoiceId, transaction);
    const receipt = await submitSignedTransaction(network, transaction, "Payment");
    await verifyPaid(receipt.logs, terms);
    await clearPendingSignedTransaction("payment", args.invoiceId);
    return {
      txHash: signed.hash,
      alreadyPaidOnChain: false,
      paidToLinkedWallet,
      payerAddress: payer.address as Address,
    };
  });
}

export type ExternalPaymentOutcome =
  | { status: "paid"; txHash: string; payerAddress: Address }
  | { status: "pending" }
  | { status: "rejected"; reason: string };

/**
 * Verify a payment the client sent from their OWN wallet. The transaction
 * hash is only a pointer; the proof is the receipt: mined successfully,
 * carrying an InvoicePaid event emitted by THIS invoice's registry, for
 * this invoice, with the committed payee and the exact amount. Anything
 * short of that is rejected, and a hash the network has not mined yet is
 * simply "pending" so the client can ask again.
 */
export async function confirmExternalPayment(
  invoice: InvoiceRow,
  txHash: Hex,
): Promise<ExternalPaymentOutcome> {
  const registry = registryFor(invoice);
  const terms = paymentTermsOf(invoice);
  if (invoice.anchorStatus !== "anchored" || !registry.address) {
    return { status: "rejected", reason: "This invoice is not anchored yet, so it cannot be paid." };
  }
  if (registry.version < 4 || !terms) {
    return {
      status: "rejected",
      reason: "This invoice predates wallet payments; pay it from the built-in wallet instead.",
    };
  }
  let receipt;
  try {
    receipt = await registry.network.publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 15_000,
    });
  } catch {
    // Not mined yet, or the RPC hiccupped: no verdict either way.
    return { status: "pending" };
  }
  if (receipt.status !== "success") {
    return { status: "rejected", reason: "The transaction was mined but reverted, so nothing was paid." };
  }
  const event = findInvoicePaidLog(receipt.logs, registry.address, invoice.id);
  if (!event) {
    return {
      status: "rejected",
      reason: "That transaction did not pay this invoice through the registry contract.",
    };
  }
  if (!paymentSettlesInvoice(event, terms)) {
    return {
      status: "rejected",
      reason: "The payment amount or destination does not match this invoice.",
    };
  }
  return { status: "paid", txHash, payerAddress: event.payer };
}

/**
 * Catch up an invoice the chain already shows as paid (the client closed the
 * tab before the app heard about the wallet payment). The contract's own
 * record - payee and amount - is checked against the committed terms; the
 * hash is recovered from the event log when the node can search it.
 */
export async function reconcileExternalPayment(
  invoice: InvoiceRow,
): Promise<{ txHash: string | null; payerAddress: Address | null } | null> {
  if (invoice.status === "paid" || invoice.anchorStatus !== "anchored") return null;
  const registry = registryFor(invoice);
  const terms = paymentTermsOf(invoice);
  if (!registry.address || registry.version < 4 || !terms) return null;
  const anchor = await readAnchor(invoice);
  if (!anchor.reachable || !anchor.anchored || !anchor.paid) return null;
  if (
    anchor.paidAmountWei !== terms.amountWei ||
    anchor.payee?.toLowerCase() !== terms.payee.toLowerCase()
  ) {
    logger.error(
      { invoiceId: invoice.id },
      "Registry reports this invoice paid with terms that do not match its commitment",
    );
    return null;
  }
  let txHash: string | null = null;
  try {
    const logs = await registry.network.publicClient.getContractEvents({
      address: registry.address,
      abi: REGISTRY_ABI,
      eventName: "InvoicePaid",
      args: { invoiceKey: invoiceKey(invoice.id) },
      fromBlock: invoice.anchorBlock ?? "earliest",
      toBlock: "latest",
    });
    txHash = logs[0]?.transactionHash ?? null;
  } catch (err) {
    logger.warn(
      { err, invoiceId: invoice.id },
      "Could not search InvoicePaid logs; recording the payment without its hash",
    );
  }
  return { txHash, payerAddress: anchor.payer };
}
