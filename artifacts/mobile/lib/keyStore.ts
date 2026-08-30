/**
 * Device storage for the restored envelope key.
 *
 * - Native (iOS/Android): expo-secure-store (Keychain / EncryptedSharedPrefs).
 *   SecureStore values are capped around 2 KB and keys may only contain
 *   [A-Za-z0-9._-], so the private key JWK (~1.7 KB) is chunked defensively
 *   and colons from the web app's naming are replaced with dots.
 * - Web (Expo web preview): localStorage, mirroring the web app's demo-grade
 *   storage semantics.
 *
 * The private key only ever arrives here through a passphrase-locked backup
 * the user restores; it is stored so envelopes keep opening on this device.
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const PREFIX = "sealed-invoices";
const CHUNK_SIZE = 1800;
const MAX_CHUNKS = 32;

type KeyKind = "privkey" | "pubkey";

function webStorageKey(kind: KeyKind, userId: string): string {
  // Same shape the web app uses in localStorage.
  return `${PREFIX}:${kind}:${userId}`;
}

function nativeBaseKey(kind: KeyKind, userId: string): string {
  const safeId = userId.replace(/[^A-Za-z0-9._-]/g, "_");
  return `${PREFIX}.${kind}.${safeId}`;
}

const isWeb = Platform.OS === "web";

function webGet(key: string): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

async function nativeGet(base: string): Promise<string | null> {
  const head = await SecureStore.getItemAsync(`${base}.n`);
  if (!head) return null;
  const count = Number(head);
  if (!Number.isInteger(count) || count < 1 || count > MAX_CHUNKS) return null;
  let value = "";
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${base}.${i}`);
    if (part === null) return null;
    value += part;
  }
  return value;
}

async function nativeSet(base: string, value: string): Promise<void> {
  // Remove any previous chunks first so a shorter value leaves no tail behind.
  await nativeDelete(base);
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  if (chunks.length === 0) chunks.push("");
  if (chunks.length > MAX_CHUNKS) {
    throw new Error("This key is unexpectedly large and cannot be stored on this device.");
  }
  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(`${base}.${i}`, chunks[i]);
  }
  // The count is written LAST so a partial write stays invisible to readers.
  await SecureStore.setItemAsync(`${base}.n`, String(chunks.length));
}

async function nativeDelete(base: string): Promise<void> {
  for (let i = 0; i < MAX_CHUNKS; i++) {
    await SecureStore.deleteItemAsync(`${base}.${i}`);
  }
  await SecureStore.deleteItemAsync(`${base}.n`);
}

export interface StoredKeys {
  publicKeyJwk: string | null;
  privateKeyJwk: string | null;
}

export async function getStoredKeys(userId: string): Promise<StoredKeys> {
  if (isWeb) {
    return {
      publicKeyJwk: webGet(webStorageKey("pubkey", userId)),
      privateKeyJwk: webGet(webStorageKey("privkey", userId)),
    };
  }
  const [publicKeyJwk, privateKeyJwk] = await Promise.all([
    nativeGet(nativeBaseKey("pubkey", userId)),
    nativeGet(nativeBaseKey("privkey", userId)),
  ]);
  return { publicKeyJwk, privateKeyJwk };
}

export async function storeKeys(
  userId: string,
  publicKeyJwk: string,
  privateKeyJwk: string,
): Promise<void> {
  if (isWeb) {
    localStorage.setItem(webStorageKey("pubkey", userId), publicKeyJwk);
    localStorage.setItem(webStorageKey("privkey", userId), privateKeyJwk);
    return;
  }
  await nativeSet(nativeBaseKey("pubkey", userId), publicKeyJwk);
  await nativeSet(nativeBaseKey("privkey", userId), privateKeyJwk);
}

export async function clearKeys(userId: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.removeItem(webStorageKey("pubkey", userId));
      localStorage.removeItem(webStorageKey("privkey", userId));
    } catch {
      // storage unavailable — nothing to clear
    }
    return;
  }
  await nativeDelete(nativeBaseKey("pubkey", userId));
  await nativeDelete(nativeBaseKey("privkey", userId));
}
