/**
 * Sealed Invoices — mobile crypto (decrypt-only port of the web library).
 *
 * The web app (artifacts/sealed-invoices/src/lib/crypto.ts) is the source of
 * truth for every byte format. This port must stay byte-compatible with it:
 *
 * - Envelope:     base64( 12-byte IV ‖ AES-256-GCM ciphertext+tag )
 * - Wrapped key:  base64( RSA-OAEP(SHA-256) encryption of the raw AES key )
 * - Fingerprint:  SHA-256 hex of stableStringify(document)
 * - Key backup:   PBKDF2-SHA-256 → AES-256-GCM, same JSON file shape
 *
 * This app NEVER generates or registers keys. It only restores a key from a
 * backup made in the web app, opens envelopes, and recomputes fingerprints.
 * React Native has no WebCrypto, so this uses audited pure-JS implementations
 * (@noble/hashes, @noble/ciphers) plus node-forge for the RSA-OAEP unwrap.
 * Decryption happens entirely on this device — plaintext never leaves it.
 */
import { gcm } from "@noble/ciphers/aes.js";
import { bytesToUtf8 } from "@noble/ciphers/utils.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import forge from "node-forge";

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

// ---------- encoding helpers (no atob/btoa/TextDecoder dependence) ----------

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const B64_LOOKUP: Int8Array = (() => {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < B64_CHARS.length; i++) table[B64_CHARS.charCodeAt(i)] = i;
  // base64url variants, so the same decoder handles JWK fields
  table["-".charCodeAt(0)] = 62;
  table["_".charCodeAt(0)] = 63;
  return table;
})();

/** Decode standard base64 or base64url into bytes. Throws on malformed input. */
export function b64ToBytes(input: string): Uint8Array {
  const s = input.replace(/\s+/g, "").replace(/=+$/, "");
  // A base64 payload can never have length ≡ 1 (mod 4); that means truncation.
  if (s.length % 4 === 1) throw new Error("Invalid base64 input");
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0;
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    const value = code < 128 ? B64_LOOKUP[code] : -1;
    if (value < 0) throw new Error("Invalid base64 input");
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buffer >> bits) & 0xff;
    }
  }
  return out.slice(0, o);
}

function bytesToBinaryString(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return bin;
}

function binaryStringToBytes(bin: string): Uint8Array {
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 0xff;
  return bytes;
}

/**
 * Deterministic JSON: object keys sorted so the same document always hashes
 * the same. MUST stay identical to the web implementation.
 */
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

/**
 * Recompute the fingerprint (the "stamp") of a decrypted document.
 * Must equal the fingerprint recorded at sealing time if nothing changed.
 */
export function computeFingerprint(document: InvoiceDocument): string {
  return bytesToHex(sha256(utf8ToBytes(stableStringify(document))));
}

// ---------- RSA-OAEP unwrap (node-forge, pure JS) ----------

interface RsaJwkFields {
  kty?: string;
  n?: string;
  e?: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
}

function jwkFieldToBigInt(field: string): forge.jsbn.BigInteger {
  const hex = bytesToHex(b64ToBytes(field));
  return new forge.jsbn.BigInteger(hex === "" ? "0" : hex, 16);
}

const DAMAGED_KEY_MESSAGE =
  "The restored envelope key looks damaged. Restore your key backup again and retry.";

/** Build a forge RSA private key from a WebCrypto-exported JWK JSON string. */
function rsaPrivateKeyFromJwk(privateKeyJwk: string): forge.pki.rsa.PrivateKey {
  let jwk: RsaJwkFields;
  try {
    jwk = JSON.parse(privateKeyJwk) as RsaJwkFields;
  } catch {
    throw new Error(DAMAGED_KEY_MESSAGE);
  }
  if (
    jwk.kty !== "RSA" ||
    !jwk.n ||
    !jwk.e ||
    !jwk.d ||
    !jwk.p ||
    !jwk.q ||
    !jwk.dp ||
    !jwk.dq ||
    !jwk.qi
  ) {
    throw new Error(DAMAGED_KEY_MESSAGE);
  }
  try {
    return forge.pki.setRsaPrivateKey(
      jwkFieldToBigInt(jwk.n),
      jwkFieldToBigInt(jwk.e),
      jwkFieldToBigInt(jwk.d),
      jwkFieldToBigInt(jwk.p),
      jwkFieldToBigInt(jwk.q),
      jwkFieldToBigInt(jwk.dp),
      jwkFieldToBigInt(jwk.dq),
      jwkFieldToBigInt(jwk.qi),
    );
  } catch {
    throw new Error(DAMAGED_KEY_MESSAGE);
  }
}

const WRONG_KEY_MESSAGE =
  "The envelope key on this device can't open this envelope. If your account's key was rotated or reset in the web app, restore your latest backup and try again.";

/** Unwrap the invoice's AES key with the user's RSA private key (JWK JSON). */
function unwrapEnvelopeKey(wrappedKeyB64: string, privateKeyJwk: string): Uint8Array {
  const privateKey = rsaPrivateKeyFromJwk(privateKeyJwk);
  let raw: string;
  try {
    raw = privateKey.decrypt(bytesToBinaryString(b64ToBytes(wrappedKeyB64)), "RSA-OAEP", {
      md: forge.md.sha256.create(),
      mgf1: { md: forge.md.sha256.create() },
    });
  } catch {
    throw new Error(WRONG_KEY_MESSAGE);
  }
  const aesKey = binaryStringToBytes(raw);
  if (aesKey.length !== 32) throw new Error(WRONG_KEY_MESSAGE);
  return aesKey;
}

/**
 * Open a sealed envelope with this user's wrapped key and restored private
 * key. Everything happens on-device; the plaintext is returned to the caller
 * and never sent anywhere.
 */
export function openEnvelope(
  ciphertext: string,
  wrappedKey: string,
  privateKeyJwk: string,
): { document: InvoiceDocument } {
  const aesKey = unwrapEnvelopeKey(wrappedKey, privateKeyJwk);
  const combined = b64ToBytes(ciphertext);
  if (combined.length <= 12) {
    throw new Error("This envelope looks damaged and cannot be opened.");
  }
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  let plaintext: Uint8Array;
  try {
    plaintext = gcm(aesKey, iv).decrypt(data);
  } catch {
    throw new Error(WRONG_KEY_MESSAGE);
  }
  const document = JSON.parse(bytesToUtf8(plaintext)) as InvoiceDocument;
  return { document };
}

// ---------- key backup restore (same file format as the web app) ----------

export interface KeyBackupFile {
  app: "sealed-invoices";
  kind: "envelope-key-backup";
  version: 1;
  userId: string;
  createdAt: string;
  publicKeyJwk: string;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; saltB64: string };
  cipher: { name: "AES-GCM"; ivB64: string };
  lockedPrivateKeyB64: string;
}

/** Reject absurd values from a tampered file so key derivation can't freeze the app. */
const MAX_PBKDF2_ITERATIONS = 5_000_000;

function looksLikeBackupFile(value: unknown): value is KeyBackupFile {
  if (typeof value !== "object" || value === null) return false;
  const f = value as Record<string, unknown>;
  const kdf = f.kdf as Record<string, unknown> | null | undefined;
  const cipher = f.cipher as Record<string, unknown> | null | undefined;
  return (
    f.app === "sealed-invoices" &&
    f.kind === "envelope-key-backup" &&
    f.version === 1 &&
    typeof f.userId === "string" &&
    typeof f.publicKeyJwk === "string" &&
    typeof f.lockedPrivateKeyB64 === "string" &&
    typeof kdf === "object" &&
    kdf !== null &&
    kdf.name === "PBKDF2" &&
    kdf.hash === "SHA-256" &&
    typeof kdf.saltB64 === "string" &&
    typeof kdf.iterations === "number" &&
    Number.isInteger(kdf.iterations) &&
    typeof cipher === "object" &&
    cipher !== null &&
    cipher.name === "AES-GCM" &&
    typeof cipher.ivB64 === "string"
  );
}

/** True when two public-key JWK JSON strings describe the same RSA key. */
export function publicKeysMatch(aJwkJson: string, bJwkJson: string): boolean {
  try {
    const a = JSON.parse(aJwkJson) as RsaJwkFields;
    const b = JSON.parse(bJwkJson) as RsaJwkFields;
    return typeof a.n === "string" && a.kty === b.kty && a.n === b.n && a.e === b.e;
  } catch {
    return false;
  }
}

/**
 * True when a stored public/private JWK pair belongs together. Guards against
 * a crash mid-write leaving one half from an old key next to the other half
 * of a new one — such a mix must be treated as "no key on this device".
 */
export function keyPairIsConsistent(publicKeyJwk: string, privateKeyJwk: string): boolean {
  try {
    const pub = JSON.parse(publicKeyJwk) as RsaJwkFields;
    const priv = JSON.parse(privateKeyJwk) as RsaJwkFields;
    return (
      pub.kty === "RSA" &&
      priv.kty === "RSA" &&
      typeof pub.n === "string" &&
      typeof priv.d === "string" &&
      priv.n === pub.n &&
      priv.e === pub.e
    );
  } catch {
    return false;
  }
}

/**
 * Unlock an envelope-key backup file made in the web app. Validates
 * everything and returns the key material WITHOUT storing it — the caller
 * decides where it goes. All errors are plain-language and safe to show
 * directly in the UI. Mirrors the web app's importKeyBackup checks:
 * - the file really is one of our backups, made for this account;
 * - the passphrase unlocks it;
 * - the two key halves belong together;
 * - the key matches the account's registered public key. The registered key
 *   is REQUIRED here: without the server's answer we cannot know whether this
 *   backup would open the account's envelopes, so restoring must wait.
 */
export function unlockKeyBackup(
  fileText: string,
  passphrase: string,
  expected: { userId: string; registeredPublicKeyJwk: string },
): { privateKeyJwk: string; publicKeyJwk: string } {
  if (!expected.registeredPublicKeyJwk) {
    throw new Error(
      "Your account's registered key hasn't loaded yet, so this backup can't be checked against it. Try again in a moment.",
    );
  }
  let file: KeyBackupFile;
  try {
    const parsed: unknown = JSON.parse(fileText);
    if (!looksLikeBackupFile(parsed)) throw new Error("shape");
    file = parsed;
  } catch {
    throw new Error(
      "That text doesn't look like a Sealed Invoices key backup. Paste the whole contents of the file you downloaded from \u201CBack up my envelope key\u201D in the web app.",
    );
  }

  if (file.userId !== expected.userId) {
    throw new Error(
      "This backup belongs to a different account. Sign in with the account that made it, or use a different file.",
    );
  }
  if (file.kdf.iterations < 1 || file.kdf.iterations > MAX_PBKDF2_ITERATIONS) {
    throw new Error("This backup file looks damaged (unexpected settings). Try a different copy.");
  }

  let privJwkStr: string;
  try {
    const derivedKey = pbkdf2(sha256, utf8ToBytes(passphrase), b64ToBytes(file.kdf.saltB64), {
      c: file.kdf.iterations,
      dkLen: 32,
    });
    const decrypted = gcm(derivedKey, b64ToBytes(file.cipher.ivB64)).decrypt(
      b64ToBytes(file.lockedPrivateKeyB64),
    );
    privJwkStr = bytesToUtf8(decrypted);
  } catch {
    throw new Error("That passphrase didn't unlock this backup. Check it and try again.");
  }

  // Sanity: the decrypted content must be the RSA private key matching the
  // public half stored in the file.
  let privJwk: RsaJwkFields;
  let pubJwk: RsaJwkFields;
  try {
    privJwk = JSON.parse(privJwkStr) as RsaJwkFields;
    pubJwk = JSON.parse(file.publicKeyJwk) as RsaJwkFields;
  } catch {
    throw new Error("This backup file looks damaged. Try a different copy.");
  }
  if (
    privJwk.kty !== "RSA" ||
    !privJwk.d ||
    !privJwk.n ||
    pubJwk.kty !== "RSA" ||
    !pubJwk.n ||
    !pubJwk.e ||
    privJwk.n !== pubJwk.n ||
    privJwk.e !== pubJwk.e
  ) {
    throw new Error(
      "This backup file looks damaged (the two key halves don't match). Try a different copy.",
    );
  }

  // The key in the backup must be the key this account's envelopes were sealed for.
  if (!publicKeysMatch(file.publicKeyJwk, expected.registeredPublicKeyJwk)) {
    throw new Error(
      "This backup holds a different key than the one your account's envelopes were sealed for, so it wouldn't open them. Make a fresh backup in the browser where your invoices open, then restore that file here.",
    );
  }

  // Confirm the private key actually builds before the caller stores anything.
  rsaPrivateKeyFromJwk(privJwkStr);

  return { privateKeyJwk: privJwkStr, publicKeyJwk: file.publicKeyJwk };
}

/** Can this device open envelopes sealed for this account? */
export type LocalKeyStatus = "ready" | "needs-restore";

/**
 * "ready" when this device holds the private key matching the account's
 * registered public key. "needs-restore" when envelopes sealed for this
 * account will NOT open here — no local key yet, or the account's key was
 * rotated/reset in the web app after this backup was restored.
 */
export function getLocalKeyStatus(
  localPublicKeyJwk: string | null,
  localPrivateKeyJwk: string | null,
  registeredPublicKeyJwk: string | null,
): LocalKeyStatus {
  if (!localPrivateKeyJwk || !localPublicKeyJwk) return "needs-restore";
  if (!registeredPublicKeyJwk) return "ready";
  return publicKeysMatch(localPublicKeyJwk, registeredPublicKeyJwk)
    ? "ready"
    : "needs-restore";
}
