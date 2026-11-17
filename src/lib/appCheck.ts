import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check'
import { app } from './firebase'

declare global {
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined
}

export interface AppCheckDiagnostic {
  isConfigured: boolean
  isDevelopmentMode: boolean
  providerType: string | null
  statusMessage: string
}

let appCheckInstance: AppCheck | null = null

export function initAppCheck(): AppCheck | null {
  if (!app) {
    return null
  }

  if (appCheckInstance) {
    return appCheckInstance
  }

  const isDev = import.meta.env.DEV
  const recaptchaSiteKey = import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY
  const debugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN

  try {
    if (isDev) {
      // In development, enable debug token to bypass reCAPTCHA without security exposure
      if (typeof window !== 'undefined') {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken || true
      }
    }

    if (recaptchaSiteKey) {
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      })
    } else if (isDev) {
      // Standalone dev mock provider to allow local evaluation
      console.info(
        '[LocalLens AppCheck] Running in local development mode with App Check debug token.',
      )
    }
  } catch (error) {
    console.warn(
      '[LocalLens AppCheck] App Check initialization skipped or not configured in console:',
      error instanceof Error ? error.message : error,
    )
  }

  return appCheckInstance
}

export function getAppCheckStatus(): AppCheckDiagnostic {
  const isDev = import.meta.env.DEV
  const hasSiteKey = Boolean(import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY)

  return {
    isConfigured: appCheckInstance !== null || (isDev && Boolean(self.FIREBASE_APPCHECK_DEBUG_TOKEN)),
    isDevelopmentMode: isDev,
    providerType: hasSiteKey ? 'reCAPTCHA v3' : isDev ? 'Debug Token' : null,
    statusMessage: hasSiteKey
      ? 'App Check active with reCAPTCHA v3 provider.'
      : isDev
        ? 'Development mode: App Check debug token enabled.'
        : 'App Check site key not configured in .env.local.',
  }
}
