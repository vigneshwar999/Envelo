/**
 * Envelo — browser encryption library ("the envelope and the stamp").
 *
 * Everything here runs in the user's browser using the built-in Web Crypto API.
 * The server receives ciphertext, wrapped keys, fingerprints, and limited
 * workflow metadata — never the sealed document body or a private key.
 *
 * Model:
 * - Each signed-in user has an RSA-OAEP keypair. The private key lives in
 *   localStorage (demo-grade storage — fine for a testnet demo). By default
 *   envelopes only open in the browser where the account was first used, but
 *   the user can carry the key to another device with a passphrase-locked
 *   backup file (exportKeyBackup / importKeyBackup below). The public key is
 *   registered with the server so others can wrap keys for this user.
 * - Each invoice is sealed with a fresh random AES-256-GCM key ("the envelope").
 * - That AES key is wrapped (encrypted) once per allowed viewer with their
 *   RSA public key. Granting access later = unwrap your copy, re-wrap for the
 *   new viewer. The envelope itself never changes.
 * - The fingerprint ("the stamp") is the SHA-256 hash of the canonical
 *   plaintext JSON. The document includes a random nonce so the hash of a
 *   small predictable invoice can't be guessed by brute force.
 *
 * Typical flows (userId is the signed-in user's id):
 *
 *   // Right after sign-in (once per user per browser):
 *   const { publicKeyJwk } = await ensureUserKeys(userId);
 *   // → POST /users/me/sync with { displayName, email, publicKeyJwk }
 *
 *   // Creating an invoice:
 *   const sealed = await sealInvoice(document, [
 *     { userId: me.id, publicKeyJwk: myJwk },
 *     { userId: client.id, publicKeyJwk: clientJwk },
 *   ]);
 *   // → POST /invoices with sealed.ciphertext, sealed.fingerprint, sealed.wrappedKeys
 *
 *   // Opening an envelope (any user with a wrapped key):
 *   const { document } = await openEnvelope(ciphertext, wrappedKey, userId);
 *
 *   // Granting access (owner → grantee):
 *   const wrappedForGrantee = await rewrapKeyForUser(
 *     myWrappedKey, me.id, granteePublicKeyJwk,
 *   );
 *   // → POST /invoices/{id}/grants with { wrappedKey: wrappedForGrantee, ... }
 *
 *   // Verifying (after opening):
 *   const fingerprint = await computeFingerprint(document);
 *   // → POST /invoices/{id}/verify with { computedFingerprint: fingerprint }
 *
 *   // Moving to a new device (the server never sees any of this):
 *   const backup = await exportKeyBackup(userId, passphrase);   // old device
 *   await importKeyBackup(fileText, passphrase, {               // new device
 *     userId, registeredPublicKeyJwk,
 *   });
 */

/** The private invoice document that lives inside the sealed envelope. */
export interface InvoiceDocument {
  invoiceNumber: string;
  title: string;
  freelancerName: string;
  clientName: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPriceUsdc: string;
  }>;
  notes: string;
  issueDate: string;
  dueDate: string | null;
  amountUsdc: string;
  /** Random hex added at sealing time; prevents fingerprint guessing. */
  nonce: string;
}

export interface SealedResult {
  /** Base64 (iv + AES-GCM ciphertext) — the sealed envelope. */
  ciphertext: string;
  /** SHA-256 hex of the canonical plaintext — the tamper-proof stamp. */
  fingerprint: string;
  /** The AES key wrapped once per allowed viewer. */
  wrappedKeys: Array<{ userId: string; wrappedKey: string }>;
  /** The document as sealed (includes the generated nonce). */
  document: InvoiceDocument;
}

const STORAGE_PREFIX = "sealed-invoices";

// ---------- small encoding helpers ----------

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bufToHex(bytes.buffer);
}

/** Deterministic JSON: object keys sorted so the same document always hashes the same. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return `{${parts.join(",")}}`;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return bufToHex(digest);
}

// ---------- user keypairs ----------

const RSA_PARAMS: RsaHashedKeyGenParams = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

function privKeyStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:privkey:${userId}`;
}

function pubKeyStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:pubkey:${userId}`;
}

/**
 * Make sure this user has a keypair in this browser.
 * Returns the public key JWK as a JSON string (register it with the server).
 */
export async function ensureUserKeys(
  userId: string,
): Promise<{ publicKeyJwk: string; created: boolean }> {
  const existing = localStorage.getItem(pubKeyStorageKey(userId));
  const existingPriv = localStorage.getItem(privKeyStorageKey(userId));
  if (existing && existingPriv) {
    return { publicKeyJwk: existing, created: false };
  }
  const pair = await crypto.subtle.generateKey(RSA_PARAMS, true, ["wrapKey", "unwrapKey"]);
  const pubJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const pubStr = JSON.stringify(pubJwk);
  localStorage.setItem(pubKeyStorageKey(userId), pubStr);
  localStorage.setItem(privKeyStorageKey(userId), JSON.stringify(privJwk));
  return { publicKeyJwk: pubStr, created: true };
}

/**
 * Generate a fresh RSA keypair WITHOUT touching storage. Used by the
 * lost-key reset flow, which must not overwrite anything until the server
 * has accepted the new public key - if that call fails, this browser keeps
 * whatever it had.
 */
export async function generateKeypairJwk(): Promise<{
  publicKeyJwk: string;
  privateKeyJwk: string;
}> {
  const pair = await crypto.subtle.generateKey(RSA_PARAMS, true, ["wrapKey", "unwrapKey"]);
  const pubJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return {
    publicKeyJwk: JSON.stringify(pubJwk),
    privateKeyJwk: JSON.stringify(privJwk),
  };
}

/** Overwrite this browser's stored key material (lost-key reset, after the server accepted the new key). */
export function storeUserKeys(
  userId: string,
  publicKeyJwk: string,
  privateKeyJwk: string,
): void {
  localStorage.setItem(pubKeyStorageKey(userId), publicKeyJwk);
  localStorage.setItem(privKeyStorageKey(userId), privateKeyJwk);
}

/** The user's public key JWK JSON if it exists in this browser. */
export function getStoredPublicKeyJwk(userId: string): string | null {
  return localStorage.getItem(pubKeyStorageKey(userId));
}

/** True when this browser holds the user's private key (can open envelopes). */
export function hasPrivateKey(userId: string): boolean {
  return localStorage.getItem(privKeyStorageKey(userId)) !== null;
}

// ---------- staged key rotation (crash-safe two-phase commit) ----------
//
// During a key rotation, the ONLY copy of the new private key lives in this
// browser. If it existed merely in memory while the server swapped every
// envelope copy over to it, a closed tab in that window would lose the key
// forever - every envelope re-wrapped for a key nobody holds. So rotation is
// two-phase on the client: the new keypair is STAGED here (durably, next to
// the active key, which stays untouched) BEFORE the server is asked to swap,
// and only promoted to the active slot once the outcome is known.
//
// Resolving a leftover staged record is subtle. If the registered key
// already equals the staged one, the swap committed - promote. But if it
// does NOT, that proves nothing: the request from the dead page may still
// be in flight and could commit later. The staged key may only be discarded
// after the server FENCES that request out (the bumpRotationFence endpoint,
// which shares the row lock with rotations) and still reports a different
// key. UserContext drives that protocol; the helpers here never guess.

function stagedRotationStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:staged-rotation:${userId}`;
}

/** Durably record the keypair a rotation is about to move this account to. Must run BEFORE the server call. */
export function stageKeyRotation(
  userId: string,
  publicKeyJwk: string,
  privateKeyJwk: string,
): void {
  localStorage.setItem(
    stagedRotationStorageKey(userId),
    JSON.stringify({ publicKeyJwk, privateKeyJwk, stagedAt: new Date().toISOString() }),
  );
}

/** The staged-but-not-promoted rotation keypair, if one is pending in this browser. */
export function getStagedRotation(
  userId: string,
): { publicKeyJwk: string; privateKeyJwk: string } | null {
  const raw = localStorage.getItem(stagedRotationStorageKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { publicKeyJwk?: unknown; privateKeyJwk?: unknown };
    if (
      typeof parsed.publicKeyJwk === "string" &&
      typeof parsed.privateKeyJwk === "string"
    ) {
      return { publicKeyJwk: parsed.publicKeyJwk, privateKeyJwk: parsed.privateKeyJwk };
    }
  } catch {
    // fall through - unreadable staged records are useless
  }
  localStorage.removeItem(stagedRotationStorageKey(userId));
  return null;
}

/** Forget a staged rotation (after promotion, or once the server PROVABLY fenced the swap out). */
export function discardStagedRotation(userId: string): void {
  localStorage.removeItem(stagedRotationStorageKey(userId));
}

/** Move the staged keypair into the active slot (the swap is known committed). */
export function promoteStagedRotation(userId: string): boolean {
  const staged = getStagedRotation(userId);
  if (!staged) return false;
  storeUserKeys(userId, staged.publicKeyJwk, staged.privateKeyJwk);
  discardStagedRotation(userId);
  return true;
}

/**
 * First, lock-free look at a leftover staged rotation:
 *
 * - 'promoted': the registered key IS the staged key - the swap committed
 *   and this browser just never heard the answer. Keys are stored, done.
 * - 'pending': the registered key is something else. NOT proof of anything:
 *   the original request may still be in flight and commit later. The
 *   caller must ask the server to fence it out (bumpRotationFence) and only
 *   act on THAT verdict. Nothing is ever discarded here.
 * - 'none': no staged record.
 */
export function reconcileStagedRotation(
  userId: string,
  registeredPublicKeyJwk: string | null,
): "promoted" | "pending" | "none" {
  const staged = getStagedRotation(userId);
  if (!staged) return "none";
  if (registeredPublicKeyJwk !== null && staged.publicKeyJwk === registeredPublicKeyJwk) {
    promoteStagedRotation(userId);
    return "promoted";
  }
  return "pending";
}

// True while THIS page session has a rotation request in flight. The
// recovery flow must not fence while it is set - it would shoot down our
// own request mid-air; the dialog resolves its own outcome instead.
let rotationRequestInFlight = false;
export function setRotationRequestInFlight(inFlight: boolean): void {
  rotationRequestInFlight = inFlight;
}
export function isRotationRequestInFlight(): boolean {
  return rotationRequestInFlight;
}

async function importPublicKey(publicKeyJwk: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    JSON.parse(publicKeyJwk) as JsonWebKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["wrapKey"],
  );
}

async function importPrivateKey(userId: string): Promise<CryptoKey> {
  const stored = localStorage.getItem(privKeyStorageKey(userId));
  if (!stored) {
    throw new Error(
      "This browser doesn't hold your envelope key. Restore it from your key backup (Dashboard → Envelope Key), or open this in the browser where you first signed in.",
    );
  }
  return crypto.subtle.importKey(
    "jwk",
    JSON.parse(stored) as JsonWebKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["unwrapKey"],
  );
}

// ---------- key backup & restore (open envelopes on any device) ----------
//
// The private key never leaves the browser in plaintext. A backup is the
// private key JWK encrypted with a key derived from a user-chosen passphrase
// (PBKDF2-SHA-256 → AES-256-GCM). The backup is a file the user downloads and
// keeps — the server never sees it, and without the passphrase it is useless.

export interface KeyBackupFile {
  app: "sealed-invoices";
  kind: "envelope-key-backup";
  version: 1;
  /** The account this key belongs to (the signed-in user's id). */
  userId: string;
  createdAt: string;
  /** Public half in the clear — it is public by design. */
  publicKeyJwk: string;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; saltB64: string };
  cipher: { name: "AES-GCM"; ivB64: string };
  /** The private key JWK, sealed with the passphrase-derived key. */
  lockedPrivateKeyB64: string;
}

const BACKUP_KIND = "envelope-key-backup";
/** OWASP-recommended ballpark for PBKDF2-SHA-256. */
const BACKUP_PBKDF2_ITERATIONS = 310_000;
/** Reject absurd values from a tampered file so key derivation can't freeze the tab. */
const MAX_PBKDF2_ITERATIONS = 5_000_000;

async function deriveBackupKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function looksLikeBackupFile(value: unknown): value is KeyBackupFile {
  if (typeof value !== "object" || value === null) return false;
  const f = value as Record<string, unknown>;
  const kdf = f.kdf as Record<string, unknown> | null | undefined;
  const cipher = f.cipher as Record<string, unknown> | null | undefined;
  return (
    f.app === STORAGE_PREFIX &&
    f.kind === BACKUP_KIND &&
    typeof f.userId === "string" &&
    typeof f.publicKeyJwk === "string" &&
    typeof f.lockedPrivateKeyB64 === "string" &&
    typeof kdf === "object" &&
    kdf !== null &&
    typeof kdf.saltB64 === "string" &&
    typeof kdf.iterations === "number" &&
    typeof cipher === "object" &&
    cipher !== null &&
    typeof cipher.ivB64 === "string"
  );
}

/**
 * Create a passphrase-locked backup of this user's envelope key.
 * The caller turns the returned object into a JSON file download.
 */
export async function exportKeyBackup(
  userId: string,
  passphrase: string,
): Promise<KeyBackupFile> {
  const privStored = localStorage.getItem(privKeyStorageKey(userId));
  const pubStored = localStorage.getItem(pubKeyStorageKey(userId));
  if (!privStored || !pubStored) {
    throw new Error(
      "This browser doesn't hold your envelope key, so there is nothing to back up here.",
    );
  }
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const aesKey = await deriveBackupKey(passphrase, salt, BACKUP_PBKDF2_ITERATIONS);
  const locked = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(privStored),
  );
  return {
    app: STORAGE_PREFIX,
    kind: BACKUP_KIND,
    version: 1,
    userId,
    createdAt: new Date().toISOString(),
    publicKeyJwk: pubStored,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: BACKUP_PBKDF2_ITERATIONS,
      saltB64: bufToB64(salt.buffer),
    },
    cipher: { name: "AES-GCM", ivB64: bufToB64(iv.buffer) },
    lockedPrivateKeyB64: bufToB64(locked),
  };
}

/**
 * Restore the envelope key from a backup file. Validates everything BEFORE
 * touching localStorage:
 * - the file really is one of our backups, made for this account;
 * - the passphrase unlocks it;
 * - the two key halves belong together;
 * - the key matches the account's registered public key (when one exists),
 *   because a different key would not open any of this account's envelopes.
 * All errors are plain-language and safe to show directly in the UI.
 */
export async function importKeyBackup(
  fileText: string,
  passphrase: string,
  expected: { userId: string; registeredPublicKeyJwk: string | null },
): Promise<{ publicKeyJwk: string }> {
  let file: KeyBackupFile;
  try {
    const parsed: unknown = JSON.parse(fileText);
    if (!looksLikeBackupFile(parsed)) throw new Error("shape");
    file = parsed;
  } catch {
    throw new Error(
      "That file doesn't look like an Envelo key backup. Pick the file you downloaded from \u201CBack up my envelope key\u201D.",
    );
  }

  if (file.userId !== expected.userId) {
    throw new Error(
      "This backup belongs to a different account. Sign in with the account that made it, or pick a different file.",
    );
  }
  if (file.kdf.iterations < 1 || file.kdf.iterations > MAX_PBKDF2_ITERATIONS) {
    throw new Error("This backup file looks damaged (unexpected settings). Try a different copy.");
  }

  let privJwkStr: string;
  try {
    const aesKey = await deriveBackupKey(
      passphrase,
      new Uint8Array(b64ToBuf(file.kdf.saltB64)),
      file.kdf.iterations,
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(file.cipher.ivB64)) },
      aesKey,
      b64ToBuf(file.lockedPrivateKeyB64),
    );
    privJwkStr = new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("That passphrase didn't unlock this backup. Check it and try again.");
  }

  // Sanity: the decrypted content must be the RSA private key matching the
  // public half stored in the file.
  let privJwk: JsonWebKey;
  let pubJwk: JsonWebKey;
  try {
    privJwk = JSON.parse(privJwkStr) as JsonWebKey;
    pubJwk = JSON.parse(file.publicKeyJwk) as JsonWebKey;
  } catch {
    throw new Error("This backup file looks damaged. Try a different copy.");
  }
  if (
    privJwk.kty !== "RSA" ||
    !privJwk.d ||
    !privJwk.n ||
    privJwk.n !== pubJwk.n ||
    privJwk.e !== pubJwk.e
  ) {
    throw new Error(
      "This backup file looks damaged (the two key halves don't match). Try a different copy.",
    );
  }

  // The key in the backup must be the key this account's envelopes were sealed for.
  if (
    expected.registeredPublicKeyJwk &&
    !publicKeysMatch(file.publicKeyJwk, expected.registeredPublicKeyJwk)
  ) {
    throw new Error(
      "This backup holds a different key than the one your account's envelopes were sealed for, so it wouldn't open them. Make a fresh backup in the browser where your invoices open, then restore that file here.",
    );
  }

  // Confirm the private key actually imports before storing anything.
  await crypto.subtle.importKey(
    "jwk",
    privJwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["unwrapKey"],
  );

  localStorage.setItem(privKeyStorageKey(expected.userId), privJwkStr);
  localStorage.setItem(pubKeyStorageKey(expected.userId), file.publicKeyJwk);
  return { publicKeyJwk: file.publicKeyJwk };
}

/** Can this browser open envelopes sealed for this account? */
export type LocalKeyStatus = "ready" | "needs-restore";

/** True when two public-key JWK JSON strings describe the same RSA key. */
export function publicKeysMatch(aJwkJson: string, bJwkJson: string): boolean {
  try {
    const a = JSON.parse(aJwkJson) as JsonWebKey;
    const b = JSON.parse(bJwkJson) as JsonWebKey;
    return typeof a.n === "string" && a.kty === b.kty && a.n === b.n && a.e === b.e;
  } catch {
    return false;
  }
}

/**
 * "ready" when this browser holds the private key matching the account's
 * registered public key (or nothing is registered yet, so this browser's key
 * is about to become the registered one). "needs-restore" when envelopes
 * sealed for this account will NOT open here — e.g. a second device, where
 * sync generated a fresh keypair but the server kept the original public key.
 */
export function getLocalKeyStatus(
  userId: string,
  registeredPublicKeyJwk: string | null,
): LocalKeyStatus {
  const priv = localStorage.getItem(privKeyStorageKey(userId));
  const pub = localStorage.getItem(pubKeyStorageKey(userId));
  if (!priv || !pub) return "needs-restore";
  if (!registeredPublicKeyJwk) return "ready";
  return publicKeysMatch(pub, registeredPublicKeyJwk) ? "ready" : "needs-restore";
}

// ---------- sealing / opening ----------

/**
 * Seal an invoice document: encrypt it with a fresh AES key and wrap that key
 * for every allowed viewer. Also computes the fingerprint (the stamp).
 * A random nonce is added to the document automatically if missing.
 */
export async function sealInvoice(
  document: Omit<InvoiceDocument, "nonce"> & { nonce?: string },
  recipients: Array<{ userId: string; publicKeyJwk: string }>,
): Promise<SealedResult> {
  const doc: InvoiceDocument = { ...document, nonce: document.nonce ?? randomHex(16) };
  const plaintext = stableStringify(doc);
  const fingerprint = await sha256Hex(plaintext);

  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(plaintext),
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  const wrappedKeys: Array<{ userId: string; wrappedKey: string }> = [];
  for (const recipient of recipients) {
    const pubKey = await importPublicKey(recipient.publicKeyJwk);
    const wrapped = await crypto.subtle.wrapKey("raw", aesKey, pubKey, { name: "RSA-OAEP" });
    wrappedKeys.push({ userId: recipient.userId, wrappedKey: bufToB64(wrapped) });
  }

  return { ciphertext: bufToB64(combined.buffer), fingerprint, wrappedKeys, document: doc };
}

/**
 * Open a sealed envelope with the caller's wrapped key.
 * Throws if this browser doesn't hold the user's private key.
 */
export async function openEnvelope(
  ciphertext: string,
  wrappedKey: string,
  userId: string,
): Promise<{ document: InvoiceDocument }> {
  const privKey = await importPrivateKey(userId);
  let aesKey: CryptoKey;
  try {
    aesKey = await crypto.subtle.unwrapKey(
      "raw",
      b64ToBuf(wrappedKey),
      privKey,
      { name: "RSA-OAEP" },
      { name: "AES-GCM" },
      true,
      ["decrypt"],
    );
  } catch {
    // Wrong private key for this wrapped key — the classic "second device" case.
    throw new Error(
      "The envelope key in this browser can't open this envelope. If you first used this account in another browser, restore your envelope key from a backup (Dashboard → Envelope Key) and try again.",
    );
  }
  const combined = new Uint8Array(b64ToBuf(ciphertext));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, data);
  const document = JSON.parse(new TextDecoder().decode(decrypted)) as InvoiceDocument;
  return { document };
}

/**
 * Recompute the fingerprint of a decrypted document (verification flow).
 * Must equal the fingerprint recorded at sealing time if nothing changed.
 */
export async function computeFingerprint(document: InvoiceDocument): Promise<string> {
  return sha256Hex(stableStringify(document));
}

// ---------- keep-a-copy export (self-custody of the document itself) ----------
//
// The onchain anchor survives anything, but the ENCRYPTED document lives on
// the app's server - if that server disappears, an un-exported invoice may
// become unreachable. "Download a copy" closes that gap: whoever can open
// the envelope right now can save the decrypted document as a small JSON
// file whose fingerprint anyone can recompute and compare with the anchor
// transaction on Arc - no Envelo server involved.

/** A downloadable, independently verifiable copy of one opened invoice. */
export interface InvoiceCopyFile {
  app: "sealed-invoices";
  kind: "invoice-copy";
  version: 1;
  exportedAt: string;
  /** Server-side id, so the in-app verify flow can find this invoice again. */
  invoiceId: string;
  /** The decrypted document, exactly as sealed (nonce included). */
  document: InvoiceDocument;
  /** SHA-256 hex of the canonical document JSON, recomputed at export time. */
  fingerprint: string;
  anchor: {
    /** The fingerprint the server recorded at sealing time (equals `fingerprint`). */
    fingerprintOnRecord: string;
    /** "anchored" once the fingerprint landed in an Arc testnet transaction. */
    status: string;
    txHash: string | null;
    chainId: number | null;
    explorerTxUrl: string | null;
  };
  howToVerify: string;
}

/**
 * Build the keep-a-copy file for an OPENED invoice. Recomputes the
 * fingerprint from the decrypted document and refuses to export when it does
 * not match the sealed record - a copy that contradicts its own proof would
 * be worthless to keep, and the mismatch is something the user must see (the
 * Verify button explains it), not something to bury in a file.
 *
 * The file's own claims stay honest per anchor state: only an anchored
 * invoice gets "check it against the chain" wording, and only pointers that
 * actually exist are mentioned. `stableStringify` (what the fingerprint is
 * computed over) follows RFC 8785 (JCS) for every JSON-parseable document:
 * keys sorted by UTF-16 code units, ECMAScript string escaping and number
 * formatting - so the instructions can name a precise public spec instead
 * of hand-waving "sorted keys".
 */
export async function buildInvoiceCopyFile(
  document: InvoiceDocument,
  info: {
    invoiceId: string;
    fingerprintOnRecord: string;
    anchorStatus: string;
    anchorTxHash?: string | null;
    chainId?: number | null;
    explorerBaseUrl?: string | null;
  },
): Promise<InvoiceCopyFile> {
  const fingerprint = await computeFingerprint(document);
  if (fingerprint !== info.fingerprintOnRecord) {
    throw new Error(
      "This opened document doesn't match the sealed record, so a copy wasn't saved. " +
        "Press \u201CVerify Content Matches Record\u201D to see the mismatch.",
    );
  }
  const anchored = info.anchorStatus === "anchored";
  const txHash = info.anchorTxHash ?? null;
  // An "anchored" copy without its pointers would contradict itself. The
  // builder refuses to produce one, no matter what state the caller passed -
  // a proof file cannot be corrected after the user walks away with it.
  if (anchored && (!txHash || info.chainId == null || !info.explorerBaseUrl)) {
    throw new Error(
      "This invoice is anchored onchain, but the chain pointers (transaction, chain id, explorer) " +
        "aren't loaded in this browser right now, so an incomplete copy wasn't saved. " +
        "Retry the chain check or reload the page, then download again.",
    );
  }
  const explorerTxUrl = anchored ? `${info.explorerBaseUrl}/tx/${txHash}` : null;

  const verifyRule =
    "Serialize `document` per RFC 8785 (JSON Canonicalization Scheme): object keys sorted by " +
    "UTF-16 code units at every level, arrays kept in order, no whitespace between tokens, " +
    "strings escaped and numbers formatted exactly as ECMAScript JSON.stringify does. The " +
    "SHA-256 of that string's UTF-8 bytes, hex-encoded, must equal `fingerprint`.";
  const chainClaim = anchored
    ? " The same value is embedded in the Arc testnet anchor transaction named in `anchor.txHash` " +
      "(open `anchor.explorerTxUrl` to see it), so this copy stays checkable against the chain " +
      "even if the Envelo server no longer exists."
    : " When this copy was exported, the fingerprint had NOT yet been anchored onchain " +
      "(`anchor.status` records where it stood), so there is no transaction to check it against yet. " +
      "The invoice's page in the app shows the anchor transaction once it lands; this file's " +
      "fingerprint can be compared against it then.";

  return {
    app: STORAGE_PREFIX,
    kind: "invoice-copy",
    version: 1,
    exportedAt: new Date().toISOString(),
    invoiceId: info.invoiceId,
    document,
    fingerprint,
    anchor: {
      fingerprintOnRecord: info.fingerprintOnRecord,
      status: info.anchorStatus,
      txHash,
      chainId: info.chainId ?? null,
      explorerTxUrl,
    },
    howToVerify: verifyRule + chainClaim,
  };
}

/**
 * Grant flow: unwrap your own copy of the invoice's AES key, then wrap it for
 * another user's public key. The envelope itself never changes.
 */
export async function rewrapKeyForUser(
  ownWrappedKey: string,
  ownerUserId: string,
  granteePublicKeyJwk: string,
): Promise<string> {
  const privKey = await importPrivateKey(ownerUserId);
  const aesKey = await crypto.subtle.unwrapKey(
    "raw",
    b64ToBuf(ownWrappedKey),
    privKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"],
  );
  const granteePub = await importPublicKey(granteePublicKeyJwk);
  const rewrapped = await crypto.subtle.wrapKey("raw", aesKey, granteePub, {
    name: "RSA-OAEP",
  });
  return bufToB64(rewrapped);
}
