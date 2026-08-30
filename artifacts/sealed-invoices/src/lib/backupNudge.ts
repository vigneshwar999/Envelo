/**
 * One-time "back up your envelope key" nudge, remembered per user in
 * localStorage - the same demo-grade storage the key itself lives in, so if
 * the browser data is cleared the key is gone too and starting the nudge
 * over is exactly right.
 *
 * Two independent flags:
 * - "backed up": set when a backup file is downloaded OR a backup is
 *   restored (restoring proves a usable backup file exists).
 * - "dismissed": set when the user waves the reminder away; it never nags
 *   again after that.
 */

/** Fired on window whenever a backup is made, so any visible nudge can hide itself immediately. */
export const KEY_BACKED_UP_EVENT = 'sealed-invoices:key-backed-up';

const backedUpKey = (userId: string) => `sealed-invoices:key-backup-done:${userId}`;
const dismissedKey = (userId: string) => `sealed-invoices:key-backup-nudge-dismissed:${userId}`;

/** If localStorage is unavailable, report "already handled" - never nag when dismissal can't be remembered. */
function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return true;
  }
}

function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, new Date().toISOString());
  } catch {
    // Nothing sensible to do - the nudge is best-effort by design.
  }
}

export function hasBackedUpKey(userId: string): boolean {
  return readFlag(backedUpKey(userId));
}

export function markKeyBackedUp(userId: string): void {
  writeFlag(backedUpKey(userId));
  window.dispatchEvent(new Event(KEY_BACKED_UP_EVENT));
}

export function isBackupNudgeDismissed(userId: string): boolean {
  return readFlag(dismissedKey(userId));
}

/**
 * A key reset makes any old backup file useless, so both flags start over:
 * the user should be nudged to back up the NEW key, even if they had backed
 * up or dismissed before.
 */
export function clearBackupNudge(userId: string): void {
  try {
    localStorage.removeItem(backedUpKey(userId));
    localStorage.removeItem(dismissedKey(userId));
  } catch {
    // Best-effort, like the rest of the nudge.
  }
}

export function dismissBackupNudge(userId: string): void {
  writeFlag(dismissedKey(userId));
}
