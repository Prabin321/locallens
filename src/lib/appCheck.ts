import {
  initializeAppCheck,
  getToken,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check'
import { app } from './firebase'

let instance: AppCheck | null = null
export function initAppCheck(): AppCheck | null {
  if (instance) return instance
  const siteKey = import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY
  if (!app || !siteKey || typeof window === 'undefined') return null
  // Use the registered Enterprise provider, with no automatic debug or custom provider.
  // Never embed an App Check debug token in a VITE_ variable or production bundle.
  instance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
  return instance
}
export function getAppCheckStatus() {
  return {
    isConfigured: instance !== null,
    statusMessage: instance
      ? 'App Check Enterprise provider initialized; token acceptance requires a successful Firebase request.'
      : 'App Check not initialized. Configure a reCAPTCHA Enterprise score-based site key for cloud inference.',
  }
}

/** Reject public API token errors before AI Logic can send its internal fallback token. */
export async function verifyAppCheckToken(): Promise<void> {
  const appCheck = initAppCheck()
  if (!appCheck)
    throw new Error('Cloud inference requires a configured App Check provider.')
  try {
    const result = await getToken(appCheck)
    if (!result.token) throw new Error('Missing App Check token.')
  } catch {
    // Provider errors may contain URLs or tokens; keep them out of the UI and logs.
    throw new Error(
      'App Check verification failed. Check Enterprise site key registration, allowed domains and the Firebase App Check request metrics. No AI request was made.',
    )
  }
}
