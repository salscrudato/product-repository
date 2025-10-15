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
    console.error('❌ Missing Firebase configuration:', missing);
    throw new Error(`Missing required Firebase config: ${missing.join(', ')}`);
  }

  console.log('✅ Firebase configuration validated');
};

// Initialize Firebase
let app: FirebaseApp;
try {
  validateConfig();
  app = initializeApp(firebaseConfig as Record<string, string>);
  console.log('✅ Firebase app initialized');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
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
  console.log('🔧 Connecting to Firebase Emulators...');

  try {
    // Connect to Firestore emulator
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('✅ Connected to Firestore Emulator (localhost:8080)');

    // Connect to Auth emulator
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('✅ Connected to Auth Emulator (localhost:9099)');

    // Connect to Functions emulator
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('✅ Connected to Functions Emulator (localhost:5001)');

    // Connect to Storage emulator
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('✅ Connected to Storage Emulator (localhost:9199)');
  } catch (error) {
    const err = error as Error;
    console.warn('⚠️ Emulator connection failed (may already be connected):', err.message);
  }
} else {
  console.log('🌐 Using production Firebase services');
}

// Firestore persistence is now configured via initializeFirestore with persistentLocalCache
console.log('✅ Firestore initialized with multi-tab persistent cache');

// Export app instance for advanced use cases
export default app;

