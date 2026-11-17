import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'

/**
 * Expected Firebase Project ID for LocalLens.
 */
export const EXPECTED_PROJECT_ID = 'locallens-b4060'

/**
 * Client-safe Firebase Web App configuration loaded from Vite environment variables.
 * In client-side single-page applications, these values identify the Firebase project.
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export interface FirebaseDiagnostics {
  isInitialized: boolean
  appName: string | null
  projectId: string | null
  missingKeys: string[]
  isExpectedProject: boolean
  hasPlaceholderApiKey: boolean
  sdkVersion: string
}

/**
 * Required keys for standard Firebase Web App initialization.
 */
const REQUIRED_CONFIG_KEYS: Array<{ key: keyof FirebaseOptions; envVar: string }> = [
  { key: 'apiKey', envVar: 'VITE_FIREBASE_API_KEY' },
  { key: 'authDomain', envVar: 'VITE_FIREBASE_AUTH_DOMAIN' },
  { key: 'projectId', envVar: 'VITE_FIREBASE_PROJECT_ID' },
  { key: 'appId', envVar: 'VITE_FIREBASE_APP_ID' },
]

/**
 * Validates the presence of required environment variables.
 */
export function validateFirebaseConfig(): string[] {
  const missing: string[] = []
  for (const { key, envVar } of REQUIRED_CONFIG_KEYS) {
    const value = firebaseConfig[key]
    if (!value || typeof value !== 'string' || value.trim() === '') {
      missing.push(envVar)
    }
  }
  return missing
}

/**
 * Singleton FirebaseApp initialization.
 * Prevents duplicate initialization errors during Vite HMR (Hot Module Replacement).
 *
 * Architecture Note for Checkpoint 2+:
 * Future AI Logic Hybrid Inference modules (firebase/ai: getAI, getGenerativeModel,
 * InferenceMode) will consume this initialized `app` singleton instance.
 */
function initializeFirebaseApp(): FirebaseApp | null {
  const missing = validateFirebaseConfig()
  if (missing.length > 0) {
    console.warn(
      `[LocalLens Firebase] Missing required environment variables: ${missing.join(', ')}. Check your .env.local file.`,
    )
  }

  try {
    if (getApps().length > 0) {
      return getApp()
    }
    return initializeApp(firebaseConfig)
  } catch (error) {
    console.error('[LocalLens Firebase] Initialization failed:', error)
    return null
  }
}

export const app: FirebaseApp | null = initializeFirebaseApp()

/**
 * Gathers diagnostic details about the current Firebase initialization state.
 */
export function getFirebaseDiagnostics(): FirebaseDiagnostics {
  const missing = validateFirebaseConfig()
  const apiKey = (firebaseConfig.apiKey as string) || ''

  return {
    isInitialized: app !== null,
    appName: app ? app.name : null,
    projectId: (firebaseConfig.projectId as string) || null,
    missingKeys: missing,
    isExpectedProject: firebaseConfig.projectId === EXPECTED_PROJECT_ID,
    hasPlaceholderApiKey: apiKey.includes('Placeholder'),
    sdkVersion: '13.4.0',
  }
}

/**
 * Keep the device-only AI service separate from the App Check backed cloud service.
 * Firebase AI captures its App Check provider at service creation. Creating the
 * primary AI service before App Check would leave later cloud calls without it.
 */
export function getOnDeviceFirebaseApp(): FirebaseApp {
  if (!app) throw new Error('Configure the required Firebase Web App variables.')
  const name = 'locallens-device-ai'
  return getApps().find(candidate => candidate.name === name) ?? initializeApp(app.options, name)
}
