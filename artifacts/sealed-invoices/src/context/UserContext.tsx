import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useUser as useClerkUser } from '@clerk/react';
import {
  discardStagedRotation,
  ensureUserKeys,
  getLocalKeyStatus,
  getStagedRotation,
  isRotationRequestInFlight,
  promoteStagedRotation,
  reconcileStagedRotation,
} from '@/lib/crypto';
import { clearBackupNudge } from '@/lib/backupNudge';
import {
  bumpRotationFence,
  useGetMe,
  useSyncMe,
  getGetMeQueryKey,
  getListUsersQueryKey,
  User,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

/** 'checking' while auth/profile are loading; afterwards, whether THIS browser can open envelopes. */
export type KeyStatus = 'checking' | 'ready' | 'needs-restore';

interface UserContextType {
  /** The signed-in user's server profile; undefined while loading or signed out. */
  me: User | undefined;
  isSignedIn: boolean;
  /** True while Clerk or the profile request is still loading. */
  isLoading: boolean;
  /**
   * Whether the envelope key in this browser matches the key this account's
   * envelopes are sealed for. 'needs-restore' means sealed invoices won't
   * open here until the user restores their key backup.
   */
  keyStatus: KeyStatus;
  /** Call after restoring a key backup: re-checks the key and runs one more sync pass. */
  notifyKeysChanged: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useClerkUser();
  const queryClient = useQueryClient();

  const { data: me, isLoading: isLoadingMe } = useGetMe({
    query: {
      enabled: isLoaded && !!isSignedIn,
      retry: false, // a 404 just means "not synced yet"
      queryKey: getGetMeQueryKey(),
    },
  });

  // mutateAsync is referentially stable in react-query v5, so it is safe in deps.
  const { mutateAsync: syncMe } = useSyncMe();
  const syncedForRef = useRef<string | null>(null);

  // Bumped when the key material in localStorage changes (restore from a
  // backup), so keyStatus recomputes and the sync effect runs one more pass.
  // It only changes on explicit user action — no render loops.
  const [keysVersion, setKeysVersion] = useState(0);

  // Tracks who is signed in *right now*, so an in-flight sync started for one
  // user bails out if a different user signs in mid-flight. Without this,
  // user A's profile + public key could be sent under user B's session cookie,
  // and the server's "never overwrite a key" policy would then lock B out of
  // their own envelopes for good.
  const liveUserIdRef = useRef<string | null>(null);
  liveUserIdRef.current = isLoaded && isSignedIn && clerkUser ? clerkUser.id : null;

  // One sync pass per signed-in user: generate browser encryption keys if
  // needed, then register profile + public key + wallet with the server.
  // The POST is idempotent, and the ref stops render loops.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) return;
    if (syncedForRef.current === clerkUser.id) return;
    const uid = clerkUser.id;
    syncedForRef.current = uid;
    (async () => {
      try {
        const { publicKeyJwk } = await ensureUserKeys(uid);
        if (liveUserIdRef.current !== uid) return; // user switched mid-flight
        const displayName =
          clerkUser.fullName?.trim() ||
          clerkUser.username ||
          clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] ||
          'Unnamed user';
        await syncMe({
          data: {
            displayName,
            email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
            publicKeyJwk,
          },
        });
        if (liveUserIdRef.current !== uid) return; // stale by the time it settled
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        await queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      } catch (err) {
        console.error('Account sync failed', err);
        if (syncedForRef.current === uid) {
          syncedForRef.current = null; // let a later pass retry
        }
      }
    })();
  }, [isLoaded, isSignedIn, clerkUser, syncMe, queryClient, keysVersion]);

  // After a restore, the sync effect must run once more (it early-returns per
  // user otherwise) so the server registers the key if the account had none.
  const notifyKeysChanged = useCallback(() => {
    syncedForRef.current = null;
    setKeysVersion((v) => v + 1);
  }, []);

  // Resolve any staged-but-unpromoted key rotation (a rotation whose server
  // outcome this browser never saw - crash or dropped connection mid-swap).
  // If the registered key already matches the staged one, the swap committed:
  // promote on the spot. Otherwise NEVER conclude "it never happened" from
  // appearances - the dead page's request may still be in flight and commit
  // later. Instead, ask the server to bump the rotation fence (which shares
  // the row lock with rotations, so afterwards that request can no longer
  // commit) and act on the key the bump reports: staged key -> it committed
  // after all, promote; anything else -> it never can commit, discard.
  const fencingRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUser || !me) return;
    const uid = clerkUser.id;
    const afterPromote = () => {
      // The account now runs on the recovered key: the old backup file is
      // worthless, sealed data may open again, and keyStatus must recompute.
      clearBackupNudge(uid);
      notifyKeysChanged();
      void queryClient.invalidateQueries();
    };
    const local = reconcileStagedRotation(uid, me.publicKeyJwk ?? null);
    if (local === 'promoted') {
      afterPromote();
      return;
    }
    if (local !== 'pending') return;
    // A rotation running in THIS page session resolves itself; fencing now
    // would shoot our own request down mid-air.
    if (isRotationRequestInFlight() || fencingRef.current) return;
    fencingRef.current = true;
    (async () => {
      try {
        const status = await bumpRotationFence();
        if (liveUserIdRef.current !== uid) return;
        const staged = getStagedRotation(uid);
        if (!staged) return;
        if (status.publicKeyJwk === staged.publicKeyJwk) {
          // The interrupted rotation DID commit - the staged key is the
          // account's key, and every envelope copy is wrapped for it.
          if (promoteStagedRotation(uid)) afterPromote();
        } else if (status.publicKeyJwk !== null) {
          // Fenced out: that rotation can never commit now, so the staged
          // key opens nothing and never will. The active key stays right.
          discardStagedRotation(uid);
          // Pick up the bumped fence so the next rotation submits fresh.
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        }
        // status.publicKeyJwk === null would mean the account lost its key
        // entirely - prove-nothing territory, keep the staged record for a
        // later look rather than guess.
      } catch (err) {
        // Could not reach the server to resolve it. Keep the staged record;
        // the next load tries again. Never guess.
        console.error('Could not resolve an unfinished key change', err);
      } finally {
        fencingRef.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, clerkUser, me, notifyKeysChanged, queryClient]);

  // Compare the key in this browser with the account's registered key.
  // 'needs-restore' is the second-device state: sync generated a fresh local
  // keypair, but the server (correctly) kept the originally registered key.
  const keyStatus: KeyStatus = useMemo(() => {
    void keysVersion; // recompute after a restore
    if (!isLoaded || !isSignedIn || !clerkUser || !me) return 'checking';
    return getLocalKeyStatus(clerkUser.id, me.publicKeyJwk ?? null);
  }, [isLoaded, isSignedIn, clerkUser, me, keysVersion]);

  return (
    <UserContext.Provider
      value={{
        me,
        isSignedIn: !!isSignedIn,
        isLoading: !isLoaded || (!!isSignedIn && isLoadingMe),
        keyStatus,
        notifyKeysChanged,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useMe() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useMe must be used within UserProvider');
  return context;
}
