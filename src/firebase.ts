/**
 * Firebase Configuration & Initialization
 * Modern setup with emulator support, persistence, and error handling
 */

import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  Firestore,
  initializeFirestore,
  memoryLocalCache,
  memoryEagerGarbageCollector,
  connectFirestoreEmulator,
  setLogLevel as setFirestoreLogLevel,
  onSnapshot,
  type DocumentReference,
  type Query,
  type DocumentSnapshot,
  type QuerySnapshot,
  type SnapshotListenOptions,
  type FirestoreError,
} from 'firebase/firestore';
import { Functions, getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { FirebaseStorage, getStorage, connectStorageEmulator } from 'firebase/storage';
import env, { validateEnvironment } from './config/env';

// Validate environment variables before initialization
validateEnvironment();

// Firebase configuration
interface FirebaseConfig {
  apiKey: string | undefined;
  authDomain: string | undefined;
  projectId: string | undefined;
  storageBucket: string | undefined;
  messagingSenderId: string | undefined;
  appId: string | undefined;
  measurementId?: string | undefined;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
  measurementId: env.FIREBASE_MEASUREMENT_ID
};

// Validate configuration
const validateConfig = (): void => {
  const requiredFields: (keyof FirebaseConfig)[] = ['apiKey', 'projectId', 'appId'];
  const missing = requiredFields.filter(field => !firebaseConfig[field]);

  if (missing.length > 0) {
    console.error('[ERROR] Missing Firebase configuration:', missing);
    throw new Error(`Missing required Firebase config: ${missing.join(', ')}`);
  }
};

// Initialize Firebase
let app: FirebaseApp;
try {
  validateConfig();
  app = initializeApp(firebaseConfig as unknown as Record<string, string>);
} catch (error) {
  console.error('[ERROR] Firebase initialization failed:', error);
  throw error;
}

// Initialize services
export const auth: Auth = getAuth(app);

// Initialize Firestore with explicit memory-only cache + eager GC.
// The Firestore SDK has a confirmed race condition (github.com/firebase/firebase-js-sdk/issues/9267)
// in its internal WatchChangeAggregator that causes "INTERNAL ASSERTION FAILED: Unexpected state
// (ID: ca9)" when multiple onSnapshot listeners are created/destroyed rapidly — especially under
// React StrictMode. Using explicit memoryLocalCache avoids any IndexedDB persistence that could
// contribute stale watch targets, and experimentalAutoDetectLongPolling avoids transport-layer
// issues on networks that block gRPC.
export const db: Firestore = initializeFirestore(app, {
  localCache: memoryLocalCache({ garbageCollector: memoryEagerGarbageCollector() }),
  experimentalAutoDetectLongPolling: true,
});

export const functions: Functions = getFunctions(app);
export const storage: FirebaseStorage = getStorage(app);

// Emulator configuration
const USE_EMULATORS = env.USE_FIREBASE_EMULATORS &&
                      typeof window !== 'undefined' &&
                      window.location.hostname === 'localhost';

if (USE_EMULATORS) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('[DEV] Firebase: Connected to emulators (Firestore:8080, Auth:9099, Functions:5001, Storage:9199)');
  } catch (error) {
    const err = error as Error;
    console.warn('[WARN] Firebase: Emulator connection failed:', err.message);
  }
} else {
  // Single consolidated log for production Firebase
  console.log('[OK] Firebase: Initialized (memory cache - diagnostic mode)');
}

// ---------------------------------------------------------------------------
// Firestore log-level management
// ---------------------------------------------------------------------------
// On page reload with persistent auth, onAuthStateChanged fires from the
// cached credential before the Firestore gRPC stream has re-authenticated.
// The SDK internally restarts all watch streams, and the server may reject
// them with permission-denied during the transition. The SDK logs
// "Uncaught Error in snapshot listener: permission-denied" to the console
// BEFORE any user-level error handler runs. There is no per-listener
// suppression — the only lever is the global Firestore log level.
//
// Strategy: start silent, and let the auth bootstrap code call
// `enableFirestoreLogs()` once auth is fully settled.
// ---------------------------------------------------------------------------
setFirestoreLogLevel('silent');

let firestoreLogsEnabled = false;

/** Re-enable Firestore SDK console logging (call once auth is settled). */
export const enableFirestoreLogs = (): void => {
  if (!firestoreLogsEnabled) {
    firestoreLogsEnabled = true;
    setFirestoreLogLevel('error');
  }
};

// ---------------------------------------------------------------------------
// Auth-ready gate for Firestore subscriptions
// ---------------------------------------------------------------------------
// The Firestore SDK can crash (ca9 internal assertion) if onSnapshot listeners
// are created before auth tokens have propagated to the gRPC stream. This flag
// allows services to check if auth is fully ready before subscribing.
//
// NOTE: We intentionally do NOT toggle Firestore network (disableNetwork /
// enableNetwork) during auth transitions. With memory-only cache there are no
// stale watch targets, and the disable/enable cycle itself was the primary
// trigger of the ca9 assertion failure (TargetState version -1). React Strict
// Mode double-invocation exacerbated it by running concurrent async chains
// that both toggled the network simultaneously.
// ---------------------------------------------------------------------------
let authReady = false;

/** Check if auth has fully propagated and Firestore subscriptions are safe. */
export const isAuthReady = (): boolean => authReady;

/** Mark auth as ready (call from useRole after auth settles). */
export const setAuthReady = (ready: boolean): void => {
  authReady = ready;
  // When auth becomes ready again after a logout cycle, re-enable Firestore
  // subscriptions by clearing the shutting-down flag.
  if (ready) {
    firestoreShuttingDown = false;
  }
};

/**
 * True while Firestore is in a "shutting down" state (between logout and
 * the next successful login).  Used to suppress expected subscription errors
 * during logout and to prevent safeOnSnapshot from creating new listeners.
 *
 * Unlike the previous implementation this flag is *temporary* — it is reset
 * when setAuthReady(true) is called after the next login.
 */
let firestoreShuttingDown = false;

/** Whether Firestore is in the shutting-down state (e.g. after logout). */
export const isFirestoreTerminated = (): boolean => firestoreShuttingDown;

/**
 * Prepare Firestore for logout.
 *
 * We intentionally do NOT call `terminate(db)`.  The Firestore JS SDK's
 * `terminate()` permanently destroys the client instance.  Because `db` is a
 * module-level singleton created by `initializeFirestore`, it cannot be
 * re-created — every subsequent read/write would throw "The client has already
 * been terminated."
 *
 * With `memoryLocalCache` + `memoryEagerGarbageCollector` there is no
 * persistent state to clean up.  Setting `authReady = false` is enough:
 * - `safeOnSnapshot` checks `firestoreShuttingDown` and won't create new
 *   listeners.
 * - Active listeners are cleaned up by their owning React effects when the
 *   component tree unmounts (the Router navigates to /login).
 * - `setAuthReady(true)` on next login resets the flag and re-enables
 *   subscriptions.
 */
export const prepareFirestoreForLogout = async (): Promise<void> => {
  authReady = false;
  firestoreShuttingDown = true;
  console.log('[OK] Firebase: Firestore prepared for logout (listeners blocked)');
};

/** @deprecated Use prepareFirestoreForLogout instead. Alias kept for any remaining call sites. */
export const terminateFirestore = prepareFirestoreForLogout;

// ---------------------------------------------------------------------------
// safeOnSnapshot — Crash-resilient onSnapshot wrapper
// ---------------------------------------------------------------------------
// The Firestore JS SDK has a confirmed race condition (#9267) in its internal
// WatchChangeAggregator. When two listeners are set up on the same gRPC watch
// stream before the server has acknowledged the first target, the SDK applies
// a snapshot version to a target that is still at version -1 and crashes with
// "INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9)".
//
// React StrictMode makes this worse by double-invoking effects — the first
// invocation starts a listener, the cleanup tears it down, and the second
// invocation starts a new one, all within the same microtask. Because the
// unsubscribe and the new subscribe can overlap on the Firestore internal
// async queue, the server ends up sending updates for a target the client
// has already removed but not yet fully cleaned up.
//
// Our workaround:
// 1. Defer each onSnapshot setup by one microtask (queueMicrotask) so that
//    React StrictMode's synchronous cleanup of the first mount can set the
//    `cancelled` flag BEFORE the listener is actually created. This prevents
//    orphaned listeners whose unsubscribe fires on a not-yet-created target.
// 2. Catch ca9/b815 assertion errors and auto-retry once after a brief delay
//    (the transient state resolves after the watch stream reconnects).
// ---------------------------------------------------------------------------

/**
 * Whether an error is the known Firestore SDK internal assertion failure.
 * Matches both the initial ca9 and the cascading b815 errors.
 */
function isFirestoreAssertionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes('INTERNAL ASSERTION FAILED') ||
         err.message.includes('Unexpected state');
}

/** Delay (ms) before retrying after a ca9/b815 assertion failure. */
const ASSERTION_RETRY_DELAY_MS = 200;

/**
 * Crash-resilient wrapper around Firestore's `onSnapshot`.
 *
 * Usage is identical to the native `onSnapshot`. Listener creation is deferred
 * by one microtask to let React StrictMode cleanup cancel it before the real
 * listener is created. If the SDK throws the ca9 assertion error, the listener
 * is retried once after a brief delay.
 *
 * Overloads mirror the most common onSnapshot call signatures.
 */
export function safeOnSnapshot<T>(
  reference: DocumentReference<T>,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
): () => void;
export function safeOnSnapshot<T>(
  reference: Query<T>,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
): () => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeOnSnapshot(
  reference: any,
  onNext: (snapshot: any) => void,
  onError?: (error: FirestoreError) => void,
): () => void;
export function safeOnSnapshot(
  reference: DocumentReference | Query | any,
  onNext: (snapshot: any) => void,
  onError?: (error: FirestoreError) => void,
): () => void {
  let realUnsub: (() => void) | null = null;
  let cancelled = false;
  let retried = false;

  const setup = () => {
    if (cancelled || firestoreShuttingDown) return;

    const wrappedOnError = (err: FirestoreError) => {
      // If this is the known assertion bug and we haven't retried yet,
      // tear down and retry once after a brief delay.
      if (isFirestoreAssertionError(err) && !retried && !cancelled) {
        retried = true;
        if (realUnsub) {
          try { realUnsub(); } catch { /* already dead */ }
          realUnsub = null;
        }
        setTimeout(() => { setup(); }, ASSERTION_RETRY_DELAY_MS);
        return;
      }

      // For all other errors (or if retry also failed), delegate to the caller.
      if (onError && !cancelled) {
        onError(err);
      }
    };

    try {
      realUnsub = onSnapshot(reference as any, onNext, wrappedOnError);
    } catch (err) {
      // Synchronous throw (shouldn't normally happen, but be safe)
      if (isFirestoreAssertionError(err) && !retried && !cancelled) {
        retried = true;
        setTimeout(() => { setup(); }, ASSERTION_RETRY_DELAY_MS);
      } else if (onError && !cancelled) {
        onError(err as FirestoreError);
      }
    }
  };

  // Defer by one microtask so React StrictMode's synchronous cleanup
  // can cancel before the real listener is created.
  queueMicrotask(() => {
    if (!cancelled && !firestoreShuttingDown) {
      setup();
    }
  });

  // Return synchronous unsubscribe function.
  return () => {
    cancelled = true;
    if (realUnsub) {
      try { realUnsub(); } catch { /* ignore errors during teardown */ }
      realUnsub = null;
    }
  };
}

// Export app instance for advanced use cases
export default app;

