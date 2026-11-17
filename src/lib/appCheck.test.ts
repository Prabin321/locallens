import { beforeEach, describe, it, expect, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  getToken: vi.fn(),
  provider: vi.fn(function () {}),
}))
vi.mock('firebase/app-check', () => ({
  initializeAppCheck: mocks.initialize,
  getToken: mocks.getToken,
  ReCaptchaEnterpriseProvider: mocks.provider,
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
    expect(mocks.provider).toHaveBeenCalledExactlyOnceWith('public-site-key')
  })
})

describe('App Check token verification (mocked SDK)', () => {
  it('accepts a token only after the public SDK API succeeds', async () => {
    vi.stubEnv('VITE_FIREBASE_RECAPTCHA_SITE_KEY', 'public-site-key')
    mocks.initialize.mockReturnValue({})
    mocks.getToken.mockResolvedValue({ token: 'test-only-token' })
    const module = await import('./appCheck')
    await expect(module.verifyAppCheckToken()).resolves.toBeUndefined()
    expect(mocks.getToken).toHaveBeenCalledExactlyOnceWith({})
  })
  it('fails closed when attestation is rejected and hides provider details', async () => {
    vi.stubEnv('VITE_FIREBASE_RECAPTCHA_SITE_KEY', 'public-site-key')
    mocks.initialize.mockReturnValue({})
    mocks.getToken.mockRejectedValue(new Error('sensitive provider detail'))
    const module = await import('./appCheck')
    await expect(module.verifyAppCheckToken()).rejects.toThrow(
      'No AI request was made',
    )
    await expect(module.verifyAppCheckToken()).rejects.not.toThrow(
      'sensitive provider detail',
    )
  })
  it('rejects an empty token', async () => {
    vi.stubEnv('VITE_FIREBASE_RECAPTCHA_SITE_KEY', 'public-site-key')
    mocks.initialize.mockReturnValue({})
    mocks.getToken.mockResolvedValue({ token: '' })
    const module = await import('./appCheck')
    await expect(module.verifyAppCheckToken()).rejects.toThrow(
      'App Check verification failed',
    )
  })
})
