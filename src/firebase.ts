/**
 * Firebase Configuration & Initialization
 * Modern setup with emulator support, persistence, and error handling
 */

import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  Firestore,
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager
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
  app = initializeApp(firebaseConfig as Record<string, string>);
} catch (error) {
  console.error('[ERROR] Firebase initialization failed:', error);
  throw error;
}

// Initialize services
export const auth: Auth = getAuth(app);

// Initialize Firestore with modern cache API (replaces deprecated enableMultiTabIndexedDbPersistence)
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
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
  console.log('[OK] Firebase: Initialized with persistent cache');
}

// Export app instance for advanced use cases
export default app;

