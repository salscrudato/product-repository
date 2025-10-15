/**
 * Environment Variables Helper
 * Provides compatibility between CRA (REACT_APP_) and Vite (VITE_) prefixes
 */

/**
 * Get environment variable with fallback support
 * Tries Vite prefix first, then falls back to CRA prefix
 */
const getEnv = (key: string): string | undefined => {
  // For Vite (import.meta.env)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteKey = `VITE_${key}`;
    const value = import.meta.env[viteKey];
    if (value) {
      return value;
    }
  }
  
  // For CRA (process.env) - fallback
  if (typeof process !== 'undefined' && process.env) {
    const craKey = `REACT_APP_${key}`;
    const value = process.env[craKey];
    if (value) {
      return value;
    }
  }
  
  return undefined;
};

/**
 * Environment configuration object
 */
export interface EnvConfig {
  // Firebase
  FIREBASE_API_KEY: string | undefined;
  FIREBASE_AUTH_DOMAIN: string | undefined;
  FIREBASE_PROJECT_ID: string | undefined;
  FIREBASE_STORAGE_BUCKET: string | undefined;
  FIREBASE_MESSAGING_SENDER_ID: string | undefined;
  FIREBASE_APP_ID: string | undefined;
  FIREBASE_MEASUREMENT_ID: string | undefined;
  USE_FIREBASE_EMULATORS: boolean;

  // OpenAI
  OPENAI_KEY: string | undefined;

  // News API
  NEWSDATA_KEY: string | undefined;

  // Node environment
  NODE_ENV: string;

  // Development mode
  DEV: boolean;

  // Production mode
  PROD: boolean;
}

export const env: EnvConfig = {
  // Firebase
  FIREBASE_API_KEY: getEnv('FIREBASE_API_KEY'),
  FIREBASE_AUTH_DOMAIN: getEnv('FIREBASE_AUTH_DOMAIN'),
  FIREBASE_PROJECT_ID: getEnv('FIREBASE_PROJECT_ID'),
  FIREBASE_STORAGE_BUCKET: getEnv('FIREBASE_STORAGE_BUCKET'),
  FIREBASE_MESSAGING_SENDER_ID: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  FIREBASE_APP_ID: getEnv('FIREBASE_APP_ID'),
  FIREBASE_MEASUREMENT_ID: getEnv('FIREBASE_MEASUREMENT_ID'),
  USE_FIREBASE_EMULATORS: getEnv('USE_FIREBASE_EMULATORS') === 'true',

  // OpenAI
  OPENAI_KEY: getEnv('OPENAI_KEY'),

  // News API
  NEWSDATA_KEY: getEnv('NEWSDATA_KEY'),

  // Node environment
  NODE_ENV: typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.MODE
    : (typeof process !== 'undefined' && process.env ? process.env.NODE_ENV || 'development' : 'development'),

  // Development mode
  DEV: typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.DEV
    : (typeof process !== 'undefined' && process.env ? process.env.NODE_ENV === 'development' : true),

  // Production mode
  PROD: typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.PROD
    : (typeof process !== 'undefined' && process.env ? process.env.NODE_ENV === 'production' : false),
};

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => env.DEV;

/**
 * Check if running in production mode
 */
export const isProduction = (): boolean => env.PROD;

/**
 * Get environment variable (for custom keys)
 */
export const getEnvironmentVariable = (key: string): string | undefined => getEnv(key);

export default env;

