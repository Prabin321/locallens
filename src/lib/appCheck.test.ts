import { beforeEach, describe, it, expect, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  provider: vi.fn(function () {}),
}))
vi.mock('firebase/app-check', () => ({
  initializeAppCheck: mocks.initialize,
  ReCaptchaV3Provider: mocks.provider,
}))
vi.mock('./firebase', () => ({ app: {} }))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.stubGlobal('window', {})
})
describe('App Check initialization', () => {
  it('does not pretend a debug token alone is an initialized provider', async () => {
    vi.stubEnv('VITE_FIREBASE_RECAPTCHA_SITE_KEY', '')
    const module = await import('./appCheck')
    expect(module.initAppCheck()).toBeNull()
    expect(module.getAppCheckStatus().isConfigured).toBe(false)
    expect(mocks.initialize).not.toHaveBeenCalled()
  })
  it('initializes once with a real provider and auto refresh', async () => {
    vi.stubEnv('VITE_FIREBASE_RECAPTCHA_SITE_KEY', 'public-site-key')
    mocks.initialize.mockReturnValue({})
    const module = await import('./appCheck')
    expect(module.initAppCheck()).toEqual({})
    expect(module.initAppCheck()).toEqual({})
    expect(mocks.initialize).toHaveBeenCalledTimes(1)
    expect(mocks.initialize.mock.calls[0][1].isTokenAutoRefreshEnabled).toBe(
      true,
    )
    expect(module.getAppCheckStatus().isConfigured).toBe(true)
  })
})
