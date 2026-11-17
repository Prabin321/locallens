import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check'
import { app } from './firebase'

let instance: AppCheck | null = null
export function initAppCheck(): AppCheck | null {
  if (instance) return instance
  const siteKey = import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY
  if (!app || !siteKey || typeof window === 'undefined') return null
  // Debug tokens are secrets: configure the runtime global manually in a trusted local session.
  // Never embed a debug token in a VITE_ variable or a production bundle.
  instance = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
  return instance
}
export function getAppCheckStatus() {
  return {
    isConfigured: instance !== null,
    statusMessage: instance
      ? 'App Check provider initialized; token acceptance is verified by the service.'
      : 'App Check not initialized. Configure a reCAPTCHA v3 site key for cloud inference.',
  }
}
