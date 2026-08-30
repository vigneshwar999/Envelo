// All Arc testnet interaction lives here.
// Facts (from docs.arc.io): chain id 5042002, RPC https://rpc.testnet.arc.io,
// explorer https://testnet.arcscan.app, native currency USDC with 18 decimals.
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatUnits,
  http,
  keccak256,
  parseUnits,
  toBytes,
  type Address,
} from "viem";
import { TransactionReceiptNotFoundError } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import {
  db,
  chainStateTable,
  chainWalletsTable,
  invoiceEventsTable,
  invoicesTable,
  usersTable,
  walletTransfersTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { REGISTRY_ABI, REGISTRY_BYTECODE } from "./registryArtifact";

export const ARC_RPC_URL = "https://rpc.testnet.arc.io";
export const ARC_CHAIN_ID = 5042002;
export const FAUCET_URL = "https://faucet.circle.com";
export const EXPLORER_BASE_URL = "https://testnet.arcscan.app";
export const NETWORK_NAME = "Arc Testnet";

export const arcTestnet = defineChain({
  id: ARC_CHAIN_ID,
  name: NETWORK_NAME,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC_URL] } },
  blockExplorers: { default: { name: "ArcScan", url: EXPLORER_BASE_URL } },
});

const transport = http(ARC_RPC_URL, { timeout: 8_000 });
export const publicClient = createPublicClient({ chain: arcTestnet, transport });

/**
 * Version of the compiled registry the app expects. Bump when the Solidity
 * changes: setup then pins already-anchored invoices to the old contract
 * address and deploys the new version alongside it.
 * v2: anyone may anchor (the invoice sender's wallet pays its own gas).
 */
const REGISTRY_VERSION = "2";

/** The onchain key for an invoice: keccak256 of its UUID string. */
export function invoiceKey(invoiceId: string): `0x${string}` {
  return keccak256(toBytes(invoiceId));
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
// Every onchain action is paid by the person acting: senders pay their own
// anchor gas, payers pay the invoice amount plus gas. No subsidies.

/**
 * Permanent fee estimate used whenever Arc cannot return a live estimate.
 * It is deliberately denominated in Arc's native test USDC rather than gas
 * units so every approval surface shows the same predictable fallback.
 */
export const FEE_ESTIMATE_FALLBACK_WEI = parseUnits("0.1", 18);

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

export async function getContractAddress(): Promise<Address | null> {
  return (await getChainState("contractAddress")) as Address | null;
}

export async function isRpcConnected(): Promise<boolean> {
  try {
    await publicClient.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}

export async function getBalance(address: string): Promise<bigint | null> {
  try {
    return await publicClient.getBalance({ address: address as Address });
  } catch {
    return null;
  }
}

function walletClientFor(privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({ account, chain: arcTestnet, transport });
}

// Every transaction send goes through one queue. Two concurrent sends from
// one custodial account can race for the same nonce. Volume here is tiny, so
// strict serialization is the simplest correct answer.
let txQueue: Promise<unknown> = Promise.resolve();
function enqueueTx<T>(fn: () => Promise<T>): Promise<T> {
  const run = () => fn();
  const next = txQueue.then(run, run);
  txQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/** Wait for a receipt and refuse to treat a mined-but-reverted tx as success. */
async function waitForSuccess(hash: `0x${string}`, what: string) {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 20_000,
  });
  if (receipt.status !== "success") {
    throw new Error(`${what} transaction ${hash} was mined but reverted`);
  }
  return receipt;
}

// ------------------------------------------------- setup (deploy + share)

let setupInFlight: Promise<void> | null = null;

/**
 * Idempotent, safe to call often. Once the operator wallet has been funded at
 * the faucet this deploys the registry contract and retries invoices waiting
 * to be anchored by their senders' own wallets.
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
    await ensureOperatorWallet();
    const operator = await getWallet("operator");
    if (!operator) return;
    const opBalance = await getBalance(operator.address);
    if (opBalance === null) return; // RPC unreachable right now
    if (opBalance === 0n && !(await getContractAddress())) return; // waiting on the faucet

    let contractAddress = await getContractAddress();
    const deployedVersion = await getChainState("contractVersion");
    const needsUpgrade =
      contractAddress !== null && deployedVersion !== REGISTRY_VERSION;
    if ((!contractAddress || needsUpgrade) && opBalance > 0n) {
      if (needsUpgrade && contractAddress) {
        // Invoices anchored on the outgoing contract must keep verifying
        // there forever: pin the old address onto them BEFORE the global
        // address moves. Idempotent - a failed deploy retries harmlessly.
        await db
          .update(invoicesTable)
          .set({ contractAddress })
          .where(
            and(
              eq(invoicesTable.anchorStatus, "anchored"),
              isNull(invoicesTable.contractAddress),
            ),
          );
      }
      const wallet = walletClientFor(operator.privateKey);
      const receipt = await enqueueTx(async () => {
        const hash = await wallet.deployContract({
          abi: REGISTRY_ABI,
          bytecode: REGISTRY_BYTECODE as `0x${string}`,
        });
        return waitForSuccess(hash, "Contract deploy");
      });
      if (!receipt.contractAddress) {
        throw new Error("Deploy receipt did not include a contract address");
      }
      contractAddress = receipt.contractAddress;
      await setChainState("contractAddress", contractAddress);
      await setChainState("contractVersion", REGISTRY_VERSION);
      logger.info(
        { contractAddress, version: REGISTRY_VERSION },
        "SealedInvoiceRegistry deployed on Arc testnet",
      );
    }

    if (contractAddress) {
      await retryPendingAnchors();
    }
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
  const wallet = walletClientFor(row.privateKey);
  return enqueueTx<SweepResult>(async () => {
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
      await waitForSuccess(txHash, "Balance sweep");
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

/** Read the public anchor record for an invoice straight from the contract. */
export async function readAnchor(
  invoiceId: string,
): Promise<
  | { reachable: false }
  | { reachable: true; anchored: boolean; fingerprint: string | null; paid: boolean }
> {
  // An invoice anchored on an earlier contract version keeps verifying
  // against THAT contract: its pinned address wins over the current global.
  const [inv] = await db
    .select({ pinned: invoicesTable.contractAddress })
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId));
  const contractAddress =
    (inv?.pinned as Address | null) ?? (await getContractAddress());
  if (!contractAddress) {
    return { reachable: true, anchored: false, fingerprint: null, paid: false };
  }
  try {
    const result = (await publicClient.readContract({
      address: contractAddress,
      abi: REGISTRY_ABI,
      functionName: "getAnchor",
      args: [invoiceKey(invoiceId)],
    })) as readonly [`0x${string}`, bigint, boolean, bigint, Address, Address];
    const [fingerprint, anchoredAt, paid] = result;
    if (anchoredAt === 0n) {
      return { reachable: true, anchored: false, fingerprint: null, paid: false };
    }
    return {
      reachable: true,
      anchored: true,
      fingerprint: fingerprint.slice(2),
      paid,
    };
  } catch {
    return { reachable: false };
  }
}

/**
 * Live cost of one anchor transaction (gas x current gas price), estimated
 * against the real contract with a throwaway fingerprint from the acting
 * sender's address. If Arc cannot provide a live estimate, use the permanent
 * 0.1 test-USDC fallback requested by the product.
 */
export async function estimateAnchorFeeWei(
  senderAddress: string,
): Promise<bigint> {
  const contractAddress = await getContractAddress();
  if (!contractAddress) return FEE_ESTIMATE_FALLBACK_WEI;
  try {
    const probe = keccak256(
      toBytes(`anchor-fee-probe:${Date.now()}:${Math.random()}`),
    );
    const [gas, gasPrice] = await Promise.all([
      publicClient.estimateContractGas({
        address: contractAddress,
        abi: REGISTRY_ABI,
        functionName: "anchorInvoice",
        args: [probe, probe],
        account: senderAddress as Address,
      }),
      publicClient.getGasPrice(),
    ]);
    return gas * gasPrice;
  } catch {
    return FEE_ESTIMATE_FALLBACK_WEI;
  }
}

/**
 * Record the invoice fingerprint onchain. Returns true when the invoice is
 * anchored afterwards. Failures leave the invoice pending (or unavailable
 * when the RPC itself is down) - never silently faked.
 */
export async function anchorInvoiceOnChain(invoiceId: string): Promise<boolean> {
  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId));
  if (!invoice) return false;
  if (invoice.anchorStatus === "anchored") return true;

  const contractAddress = await getContractAddress();
  // The SENDER's custodial wallet submits and pays for its own anchor - no
  // operator sponsorship. Missing wallet/contract leaves the anchor pending.
  const sender = await getWallet(invoice.freelancerId);
  if (!contractAddress || !sender) return false;

  try {
    const wallet = walletClientFor(sender.privateKey);
    const hash = await enqueueTx(async () => {
      // Re-check inside the queue: another queued attempt (creation hook,
      // retry pass, pay route) may have anchored this invoice meanwhile, and
      // a second anchor tx would just revert in the contract.
      const [fresh] = await db
        .select()
        .from(invoicesTable)
        .where(eq(invoicesTable.id, invoiceId));
      if (!fresh) throw new Error("Invoice disappeared while anchoring");
      if (fresh.anchorStatus === "anchored") return fresh.anchorTxHash;
      const existing = await readAnchor(invoiceId);
      if (existing.reachable && existing.anchored) return fresh.anchorTxHash;

      const h = await wallet.writeContract({
        address: contractAddress,
        abi: REGISTRY_ABI,
        functionName: "anchorInvoice",
        args: [invoiceKey(invoiceId), `0x${invoice.fingerprint}` as `0x${string}`],
      });
      // Keep the hash even if the receipt wait below times out, so a later
      // retry reconciles against the chain instead of losing the transaction.
      await db
        .update(invoicesTable)
        .set({ anchorTxHash: h })
        .where(eq(invoicesTable.id, invoiceId));
      await waitForSuccess(h, "Anchor");
      return h;
    });
    await markAnchored(invoiceId, hash, contractAddress);
    logger.info({ invoiceId, txHash: hash }, "Invoice fingerprint anchored on Arc");
    return true;
  } catch (err) {
    const connected = await isRpcConnected();
    await db
      .update(invoicesTable)
      .set({ anchorStatus: connected ? "pending" : "unavailable" })
      .where(eq(invoicesTable.id, invoiceId));
    logger.warn({ err, invoiceId, connected }, "Anchoring failed; will retry");
    return false;
  }
}

async function markAnchored(
  invoiceId: string,
  txHash: string | null,
  contractAddress: Address,
): Promise<void> {
  await db
    .update(invoicesTable)
    .set({
      anchorStatus: "anchored",
      anchorTxHash: txHash,
      // Pin which contract holds this anchor - but never overwrite an
      // existing pin (an early-return re-mark must not repoint an invoice
      // anchored on an older contract version at the current one).
      contractAddress: sql`COALESCE(${invoicesTable.contractAddress}, ${contractAddress})`,
    })
    .where(eq(invoicesTable.id, invoiceId));
  const events = await db
    .select()
    .from(invoiceEventsTable)
    .where(
      and(
        eq(invoiceEventsTable.invoiceId, invoiceId),
        eq(invoiceEventsTable.kind, "anchored"),
      ),
    );
  if (events.length === 0) {
    await db.insert(invoiceEventsTable).values({
      invoiceId,
      kind: "anchored",
      detail: `The invoice fingerprint (and nothing else) was recorded on ${NETWORK_NAME}.`,
      txHash,
    });
  }
}

export async function retryPendingAnchors(): Promise<void> {
  const rows = await db
    .select()
    .from(invoicesTable)
    .where(ne(invoicesTable.anchorStatus, "anchored"));
  for (const row of rows) {
    await anchorInvoiceOnChain(row.id);
  }
}

// ------------------------------------------------------------ pay preview

/**
 * Live cost of one payInvoice transaction for this invoice. Tries a real
 * simulation from the payer's own address first; a node refuses to simulate
 * a payment the payer cannot cover. Whenever the live estimate is unavailable,
 * the approval and submit guards use the permanent 0.1 test-USDC fallback.
 */
export async function estimatePayFeeWei(args: {
  invoiceId: string;
  payerAddress: string;
  payeeAddress: string;
  amountWei: bigint;
  contractAddress: Address;
}): Promise<bigint> {
  try {
    const [gas, gasPrice] = await Promise.all([
      publicClient.estimateContractGas({
        address: args.contractAddress,
        abi: REGISTRY_ABI,
        functionName: "payInvoice",
        args: [invoiceKey(args.invoiceId), args.payeeAddress as Address],
        account: args.payerAddress as Address,
        value: args.amountWei,
      }),
      publicClient.getGasPrice(),
    ]);
    return gas * gasPrice;
  } catch {
    return FEE_ESTIMATE_FALLBACK_WEI;
  }
}

/**
 * Where a payment to this payee would land right now: their linked payout
 * wallet when configured, otherwise their custodial wallet. The real payment
 * re-resolves at submit time; the preview uses this for honest display.
 */
export async function resolvePayeeAddress(
  payeeUserId: string,
): Promise<{ address: string; linked: boolean } | null> {
  const [payeeRow] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payeeUserId));
  if (payeeRow?.payoutAddress) {
    return { address: payeeRow.payoutAddress, linked: true };
  }
  const wallet = await getWallet(payeeUserId);
  return wallet ? { address: wallet.address, linked: false } : null;
}

// -------------------------------------------------------------- payments

/**
 * Send the real payment transaction from the payer's custodial wallet.
 * The registry contract forwards the attached native USDC to the payee.
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
}> {
  // Pay on the contract this invoice is actually anchored on (older
  // invoices stay on the contract version that recorded them).
  const [invRow] = await db
    .select({ pinned: invoicesTable.contractAddress })
    .from(invoicesTable)
    .where(eq(invoicesTable.id, args.invoiceId));
  const contractAddress =
    (invRow?.pinned as Address | null) ?? (await getContractAddress());
  if (!contractAddress) throw new Error("Registry contract not deployed yet");
  const payer = await getWallet(args.payerWalletId);
  if (!payer) throw new Error("Custodial wallet missing");
  const wallet = walletClientFor(payer.privateKey);
  return enqueueTx(async () => {
    // The contract is the source of truth: if an earlier attempt's receipt
    // timed out but the transaction landed, never pay a second time.
    const anchor = await readAnchor(args.invoiceId);
    if (anchor.reachable && anchor.anchored && anchor.paid) {
      return { txHash: null, alreadyPaidOnChain: true, paidToLinkedWallet: false };
    }
    // Resolve where the money goes at the LAST moment, inside the serialized
    // queue: if the payee unlinks or swaps their payout wallet while this
    // payment waits its turn, the freshest choice wins - never a stale one.
    const [payeeRow] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, args.payeeWalletId));
    const linkedAddress = payeeRow?.payoutAddress ?? null;
    const payee = linkedAddress ? null : await getWallet(args.payeeWalletId);
    if (!linkedAddress && !payee) throw new Error("Custodial wallet missing");
    const payeeAddress = (linkedAddress ?? payee!.address) as Address;
    const hash = await wallet.writeContract({
      address: contractAddress,
      abi: REGISTRY_ABI,
      functionName: "payInvoice",
      args: [invoiceKey(args.invoiceId), payeeAddress],
      value: parseUnits(args.amountUsdc, 18),
    });
    // Store the hash before waiting so a receipt timeout can be reconciled.
    await db
      .update(invoicesTable)
      .set({ payTxHash: hash })
      .where(eq(invoicesTable.id, args.invoiceId));
    await waitForSuccess(hash, "Payment");
    return {
      txHash: hash,
      alreadyPaidOnChain: false,
      paidToLinkedWallet: linkedAddress !== null,
    };
  });
}
