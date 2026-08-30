/**
 * Holds the restored envelope key for the signed-in user.
 *
 * The key pair is created and registered by the WEB app only. This context
 * loads whatever was previously restored on this device, and performs new
 * restores from a passphrase-locked backup file. It never generates keys and
 * never sends key material anywhere.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@clerk/expo";
import { keyPairIsConsistent, publicKeysMatch, unlockKeyBackup } from "@/lib/crypto";
import { clearKeys, getStoredKeys, storeKeys } from "@/lib/keyStore";

interface KeyContextValue {
  /** True while the stored key is being loaded from device storage. */
  loading: boolean;
  publicKeyJwk: string | null;
  privateKeyJwk: string | null;
  /**
   * Validate + unlock a backup file and store the key on this device.
   * Throws plain-language errors that are safe to show in the UI.
   */
  restore: (
    fileText: string,
    passphrase: string,
    registeredPublicKeyJwk: string,
  ) => Promise<void>;
  /** Forget the key on this device (does not touch the account or backups). */
  removeKey: () => Promise<void>;
}

const KeyContext = createContext<KeyContextValue | null>(null);

export function KeyProvider(props: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [publicKeyJwk, setPublicKeyJwk] = useState<string | null>(null);
  const [privateKeyJwk, setPrivateKeyJwk] = useState<string | null>(null);
  // Flips to false on unmount (the provider is remounted per user), so async
  // work started under one session can never write into another.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPublicKeyJwk(null);
    setPrivateKeyJwk(null);
    if (!userId) {
      setLoading(false);
      return;
    }
    getStoredKeys(userId)
      .then(async (stored) => {
        if (cancelled) return;
        if (
          stored.publicKeyJwk &&
          stored.privateKeyJwk &&
          !keyPairIsConsistent(stored.publicKeyJwk, stored.privateKeyJwk)
        ) {
          // Two halves from different keys (e.g. a crash mid-write). Treat as
          // no key and clean up so the UI offers a fresh restore.
          await clearKeys(userId).catch(() => {});
          return;
        }
        setPublicKeyJwk(stored.publicKeyJwk);
        setPrivateKeyJwk(stored.privateKeyJwk);
      })
      .catch(() => {
        // Unreadable storage is treated as "no key on this device".
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const restore = useCallback(
    async (fileText: string, passphrase: string, registeredPublicKeyJwk: string) => {
      if (!userId) throw new Error("You need to be signed in to restore a key.");
      // Yield once so a spinner can paint before the CPU-heavy key derivation.
      await new Promise((resolve) => setTimeout(resolve, 30));
      const unlocked = unlockKeyBackup(fileText, passphrase, {
        userId,
        registeredPublicKeyJwk,
      });
      if (!aliveRef.current) {
        throw new Error("Sign-in changed while restoring. Open this screen and try again.");
      }
      await storeKeys(userId, unlocked.publicKeyJwk, unlocked.privateKeyJwk);
      if (!aliveRef.current) return;
      setPublicKeyJwk(unlocked.publicKeyJwk);
      setPrivateKeyJwk(unlocked.privateKeyJwk);
    },
    [userId],
  );

  const removeKey = useCallback(async () => {
    if (!userId) return;
    await clearKeys(userId);
    setPublicKeyJwk(null);
    setPrivateKeyJwk(null);
  }, [userId]);

  const value = useMemo(
    () => ({ loading, publicKeyJwk, privateKeyJwk, restore, removeKey }),
    [loading, publicKeyJwk, privateKeyJwk, restore, removeKey],
  );

  return <KeyContext.Provider value={value}>{props.children}</KeyContext.Provider>;
}

export function useEnvelopeKey(): KeyContextValue {
  const ctx = useContext(KeyContext);
  if (!ctx) throw new Error("useEnvelopeKey must be used inside a KeyProvider");
  return ctx;
}

/** Derive the UI key status from local key material + the registered key. */
export function deriveKeyStatus(
  loading: boolean,
  publicKeyJwk: string | null,
  privateKeyJwk: string | null,
  registeredPublicKeyJwk: string | null | undefined,
): "loading" | "ready" | "none" | "mismatch" {
  if (loading) return "loading";
  if (!privateKeyJwk || !publicKeyJwk) return "none";
  if (!registeredPublicKeyJwk) return "ready";
  // Registered key exists — the local key must be the same one.
  return publicKeysMatch(publicKeyJwk, registeredPublicKeyJwk) ? "ready" : "mismatch";
}
