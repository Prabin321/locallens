import { beforeEach, describe, it, expect, vi } from 'vitest'
import { InferenceMode, InferenceSource } from 'firebase/ai'
import { context, content, claim } from './fixtures.test-support'
const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  initialize: vi.fn(),
  model: vi.fn(),
  ai: vi.fn(),
  appCheck: vi.fn(),
  verifyToken: vi.fn(),
  config: vi.fn(),
}))
vi.mock('firebase/ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/ai')>()),
  getAI: mocks.ai,
  getGenerativeModel: mocks.model,
}))
vi.mock('../firebase', () => ({
  app: { name: '[DEFAULT]' },
  getOnDeviceFirebaseApp: () => ({ name: 'locallens-device-ai' }),
  validateFirebaseConfig: mocks.config,
}))
vi.mock('../appCheck', () => ({
  initAppCheck: mocks.appCheck,
  verifyAppCheckToken: mocks.verifyToken,
}))
import {
  generateInsights,
  askAssistant,
  sourceMetadata,
  explainAIError,
} from './inference'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('window', { LanguageModel: {} })
  mocks.verifyToken.mockResolvedValue(undefined)
  mocks.config.mockReturnValue([])
  mocks.appCheck.mockReturnValue({})
  mocks.initialize.mockResolvedValue(undefined)
  mocks.model.mockReturnValue({
    generateContent: mocks.generate,
    initializeDeviceModel: mocks.initialize,
  })
  mocks.generate.mockResolvedValue({
    response: {
      text: () => JSON.stringify(content),
      inferenceSource: InferenceSource.ON_DEVICE,
    },
  })
})
describe('Firebase integration contract (mocked transport; not real inference)', () => {
  it.each([
    InferenceMode.PREFER_ON_DEVICE,
    InferenceMode.ONLY_IN_CLOUD,
    InferenceMode.PREFER_IN_CLOUD,
  ])('blocks %s without consent before SDK creation', async (mode) => {
    await expect(
      generateInsights(context, { mode, cloudConsent: false }),
    ).rejects.toThrow(/consent/)
    expect(mocks.model).not.toHaveBeenCalled()
    expect(mocks.appCheck).not.toHaveBeenCalled()
  })
  it.each(Object.values(InferenceMode))(
    'passes exact SDK mode %s',
    async (mode) => {
      mocks.generate.mockResolvedValue({
        response: {
          text: () => JSON.stringify(content),
          inferenceSource:
            mode === InferenceMode.ONLY_IN_CLOUD ? 'in_cloud' : 'on_device',
        },
      })
      await generateInsights(context, { mode, cloudConsent: true })
      expect(mocks.model.mock.calls[0][1].mode).toBe(mode)
      expect(mocks.initialize).toHaveBeenCalledTimes(
        mode === InferenceMode.ONLY_IN_CLOUD ? 0 : 1,
      )
    },
  )
  it.each([{}, { LanguageModel: undefined }, { LanguageModel: null }])(
    'fails closed when the native API is absent: %j',
    async (browser) => {
      vi.stubGlobal('window', browser)
      await expect(
        generateInsights(context, {
          mode: InferenceMode.ONLY_ON_DEVICE,
          cloudConsent: false,
        }),
      ).rejects.toThrow(/No cloud request/)
      expect(mocks.model).not.toHaveBeenCalled()
    },
  )
  it('rejects provenance that contradicts device-only mode', async () => {
    mocks.generate.mockResolvedValue({
      response: {
        text: () => JSON.stringify(content),
        inferenceSource: 'in_cloud',
      },
    })
    await expect(
      generateInsights(context, {
        mode: InferenceMode.ONLY_ON_DEVICE,
        cloudConsent: false,
      }),
    ).rejects.toThrow(/source/)
  })
  it('permits device-only without cloud consent or App Check', async () => {
    const result = await generateInsights(context, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      cloudConsent: false,
    })
    expect(result.inferenceSource).toBe('on_device')
    expect(result.modelUsed).toContain('Nano')
    expect(mocks.appCheck).not.toHaveBeenCalled()
    expect(mocks.verifyToken).not.toHaveBeenCalled()
    expect(mocks.ai.mock.calls[0][0].name).toBe('locallens-device-ai')
    expect(
      mocks.model.mock.calls[0][1].onDeviceParams.createOptions
        .initialPrompts[0].role,
    ).toBe('system')
  })
  it('rejects missing Firebase configuration', async () => {
    mocks.config.mockReturnValue(['VITE_FIREBASE_APP_ID'])
    await expect(
      generateInsights(context, {
        mode: InferenceMode.ONLY_ON_DEVICE,
        cloudConsent: false,
      }),
    ).rejects.toThrow(/Configure/)
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it('initializes App Check before creating the separate primary cloud AI service', async () => {
    mocks.generate.mockResolvedValue({
      response: {
        text: () => JSON.stringify(content),
        inferenceSource: 'in_cloud',
      },
    })
    await generateInsights(context, {
      mode: InferenceMode.ONLY_IN_CLOUD,
      cloudConsent: true,
    })
    expect(mocks.ai.mock.calls[0][0].name).toBe('[DEFAULT]')
    expect(mocks.verifyToken.mock.invocationCallOrder[0]).toBeLessThan(mocks.generate.mock.invocationCallOrder[0])
    expect(mocks.appCheck.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.ai.mock.invocationCallOrder[0],
    )
  })
  it.each([
    InferenceMode.ONLY_IN_CLOUD,
    InferenceMode.PREFER_ON_DEVICE,
    InferenceMode.PREFER_IN_CLOUD,
  ])('does not generate content if App Check rejects %s', async (mode) => {
    mocks.verifyToken.mockRejectedValue(
      new Error('App Check verification failed'),
    )
    await expect(
      generateInsights(context, { mode, cloudConsent: true }),
    ).rejects.toThrow('App Check verification failed')
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it('requires actual App Check initialization for cloud modes', async () => {
    mocks.appCheck.mockReturnValue(null)
    await expect(
      generateInsights(context, {
        mode: InferenceMode.ONLY_IN_CLOUD,
        cloudConsent: true,
      }),
    ).rejects.toThrow(/App Check/)
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it('stops device-only when initialization fails without generating', async () => {
    mocks.initialize.mockRejectedValue(new Error('unavailable'))
    await expect(
      generateInsights(context, {
        mode: InferenceMode.ONLY_ON_DEVICE,
        cloudConsent: false,
      }),
    ).rejects.toThrow(/Nano is unavailable/)
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it('lets consented prefer-device SDK choose the fallback after device initialization failure', async () => {
    mocks.initialize.mockRejectedValue(new Error('unavailable'))
    mocks.generate.mockResolvedValue({
      response: {
        text: () => JSON.stringify(content),
        inferenceSource: 'in_cloud',
      },
    })
    const result = await generateInsights(context, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      cloudConsent: true,
    })
    expect(result.inferenceSource).toBe('in_cloud')
    expect(result.modelUsed).not.toContain('Nano')
  })
  it('reports actual device fallback for requested cloud preference', async () => {
    const result = await generateInsights(context, {
      mode: InferenceMode.PREFER_IN_CLOUD,
      cloudConsent: true,
    })
    expect(result.inferenceSource).toBe('on_device')
    expect(result.requestedMode).toBe('prefer_in_cloud')
  })
  it.each([undefined, 'unknown', 'offline_deterministic'])(
    'rejects unknown provenance %s',
    (source) => expect(() => sourceMetadata(source, 'test')).toThrow(/source/),
  )
  it('sends only supplied aggregate facts and bounded AI conversation history', async () => {
    mocks.generate.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ answer: claim, followUps: ['Next?'] }),
        inferenceSource: 'on_device',
      },
    })
    const history = Array.from({ length: 10 }, (_, i) => ({
      question: `q${i}`,
      answer: `a${i}`,
    }))
    const result = await askAssistant(context, 'Explain this score', history, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      cloudConsent: false,
    })
    const payload = JSON.parse(mocks.generate.mock.calls[0][0])
    expect(payload.untrustedData.aggregateContext).toEqual(context)
    expect(payload.untrustedData.conversation).toHaveLength(4)
    expect(payload.untrustedData.conversation[0].question).toBe('q6')
    expect(result.followUps).toEqual(['Next?'])
  })
  it('propagates provider failures rather than claiming successful inference', async () => {
    mocks.generate.mockRejectedValue(new Error('quota'))
    await expect(
      generateInsights(context, {
        mode: InferenceMode.ONLY_ON_DEVICE,
        cloudConsent: false,
      }),
    ).rejects.toThrow('quota')
  })
  it('rejects an already canceled operation before SDK setup', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      generateInsights(context, {
        mode: InferenceMode.ONLY_ON_DEVICE,
        cloudConsent: false,
        signal: controller.signal,
      }),
    ).rejects.toThrow()
    expect(mocks.model).not.toHaveBeenCalled()
  })
  it('cancels a stalled native initialization without starting inference', async () => {
    mocks.initialize.mockReturnValue(new Promise(() => {}))
    const controller = new AbortController()
    const result = generateInsights(context, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      cloudConsent: false,
      signal: controller.signal,
    })
    controller.abort()
    await expect(result).rejects.toThrow(/canceled/)
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it('validates question length before any model setup', async () => {
    await expect(
      askAssistant(context, 'x'.repeat(1501), [], {
        mode: InferenceMode.ONLY_ON_DEVICE,
        cloudConsent: false,
      }),
    ).rejects.toThrow(/1,500/)
    expect(mocks.model).not.toHaveBeenCalled()
  })
  it('does not echo provider errors containing credentials or prompt data', () => {
    const result = explainAIError(
      new Error('HTTP failed API_KEY=secret raw-record'),
    )
    expect(result).not.toContain('secret')
    expect(result).not.toContain('raw-record')
  })
})
