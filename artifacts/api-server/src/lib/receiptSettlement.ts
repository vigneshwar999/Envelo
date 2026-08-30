// Pure decision logic for settling a "sending" transfer receipt from what
// the chain says. Kept free of IO so it can be tested exhaustively - this is
// the part that decides whether a user's receipt appears, so every branch
// must be predictable.

import type { checkTxOutcome } from "../chain/arc";

export type TxOutcome = Awaited<ReturnType<typeof checkTxOutcome>>;

/**
 * How long a "sending" receipt's CURRENT attempt (its last_attempt_at) may
 * stay unseen by the chain before it is settled as failed. Arc confirms in
 * seconds; ten minutes of "never heard of that hash" means the transaction
 * was never broadcast or was dropped. Measured from the last attempt, not
 * the first, so a revived retry gets a fresh window.
 */
export const NEVER_BROADCAST_WINDOW_MS = 10 * 60_000;

/**
 * Decide what a "sending" receipt becomes, given the chain's answer and the
 * receipt's age. Returns null when nothing can honestly be decided yet:
 * - confirmed on chain -> confirmed (money moved, list it)
 * - reverted on chain -> failed (mined but did nothing, never list it)
 * - hash never seen AND well past finality -> failed (never made it out)
 * - hash never seen but still fresh -> wait, it may just be propagating
 * - chain unreachable -> wait, in doubt claim nothing
 */
export function decideSettlement(
  outcome: TxOutcome,
  ageMs: number,
): "confirmed" | "failed" | null {
  if (outcome === "confirmed") return "confirmed";
  if (outcome === "reverted") return "failed";
  if (outcome === "notfound" && ageMs > NEVER_BROADCAST_WINDOW_MS) return "failed";
  return null;
}
