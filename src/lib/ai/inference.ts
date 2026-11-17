import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
  type GenerativeModel,
} from 'firebase/ai'
import { app, getOnDeviceFirebaseApp, validateFirebaseConfig } from '../firebase'
import { initAppCheck } from '../appCheck'
import { getSystemInstructions } from './contextBuilder'
import {
  CHAT_CONTRACT,
  INSIGHT_CONTRACT,
  chatSchema,
  insightSchema,
  parseChatResponse,
  parseStructuredAIResponse,
} from './responseParser'
import type {
  AssistantReply,
  ConversationTurn,
  DatasetContext,
  DeviceState,
  InsightReport,
} from '../../types/ai'

export const MODES = Object.values(InferenceMode)
export interface InferenceOptions {
  mode: InferenceMode
  cloudConsent: boolean
  signal?: AbortSignal
  onDeviceState?: (state: DeviceState, progress?: number) => void
}
export function assertInferencePermission(options: InferenceOptions) {
  if (
    options.mode === InferenceMode.ONLY_ON_DEVICE &&
    (typeof window === 'undefined' ||
      !('LanguageModel' in window) ||
      !window.LanguageModel)
  ) {
    throw new Error(
      'Gemini Nano is unavailable in this browser. No cloud request was made.',
    )
  }
  if (!MODES.includes(options.mode)) throw new Error('Unknown inference mode.')
  if (options.mode !== InferenceMode.ONLY_ON_DEVICE && !options.cloudConsent) {
    throw new Error(
      'Cloud-capable modes require consent before any inference or fallback.',
    )
  }
}
export function sourceMetadata(source: unknown, cloudModel: string) {
  if (
    source !== InferenceSource.ON_DEVICE &&
    source !== InferenceSource.IN_CLOUD
  ) {
    throw new Error(
      'The SDK did not report the actual inference source. Result discarded.',
    )
  }
  return {
    inferenceSource: source,
    modelUsed:
      source === InferenceSource.ON_DEVICE
        ? 'Gemini Nano (browser managed; exact version unavailable)'
        : cloudModel,
  }
}

function createModel(
  kind: 'insights' | 'chat',
  options: InferenceOptions,
): { model: GenerativeModel; cloudModel: string } {
  assertInferencePermission(options)
  if (!app || validateFirebaseConfig().length)
    throw new Error(
      'Configure the required Firebase Web App variables before using Firebase AI Logic.',
    )
  if (options.mode !== InferenceMode.ONLY_ON_DEVICE && !initAppCheck()) {
    throw new Error(
      'Cloud inference requires a configured App Check provider. Set VITE_FIREBASE_RECAPTCHA_SITE_KEY and register your domain in Firebase.',
    )
  }
  // Pin a configured deployed model rather than guessing model availability or enabling paid services.
  const cloudModel =
    import.meta.env.VITE_FIREBASE_AI_MODEL || 'gemini-2.5-flash'
  const instructions = getSystemInstructions()
  const model = getGenerativeModel(
    getAI(options.mode === InferenceMode.ONLY_ON_DEVICE ? getOnDeviceFirebaseApp() : app, { backend: new GoogleAIBackend() }),
    {
      mode: options.mode,
      onDeviceParams: {
        createOptions: {
          signal: options.signal,
          expectedInputs: [{ type: 'text', languages: ['en'] }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
          initialPrompts: [
            {
              role: 'system',
              content: [{ type: 'text', value: instructions }],
            },
          ],
        },
      },
      inCloudParams: {
        model: cloudModel,
        systemInstruction: instructions,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: kind === 'chat' ? chatSchema : insightSchema,
          maxOutputTokens: 4096,
        },
      },
    },
    { timeout: 60000 },
  )
  return { model, cloudModel }
}

async function initialize(model: GenerativeModel, options: InferenceOptions) {
  if (options.mode === InferenceMode.ONLY_IN_CLOUD) return
  options.onDeviceState?.('checking')
  // This is called from a user gesture so Chrome can download Gemini Nano if supported.
  try {
    await model.initializeDeviceModel((progress) =>
      options.onDeviceState?.('downloading', progress),
    )
    // A resolved call in prefer modes does not establish device availability. Only the response does.
    options.onDeviceState?.('uninitialized')
  } catch {
    options.onDeviceState?.('unavailable')
    if (options.mode === InferenceMode.ONLY_ON_DEVICE) {
      throw new Error(
        'Gemini Nano is unavailable or its download failed. Use supported desktop Chrome with Prompt API access and sufficient device resources. No cloud request was made.',
      )
    }
    // Explicitly consented native SDK modes decide whether cloud or device can handle the request.
  }
}
function payload(
  context: DatasetContext,
  contract: string,
  question?: string,
  history: ConversationTurn[] = [],
) {
  if (context.facts.length > 200 || JSON.stringify(context).length > 35000)
    throw new Error('Aggregate context is too large.')
  if (question && question.length > 1500)
    throw new Error('Keep questions under 1,500 characters.')
  return JSON.stringify({
    task: question
      ? 'Answer the question and suggest follow-ups.'
      : 'Explain this dataset, quality, descriptive insights, manual cleaning recommendations and next analyses.',
    responseContract: contract,
    untrustedData: {
      aggregateContext: context,
      question,
      conversation: history.slice(-4).map((t) => ({
        question: t.question.slice(0, 1500),
        answer: t.answer.slice(0, 3000),
      })),
    },
  })
}
function requestScope(
  options: InferenceOptions,
): InferenceOptions & { signal: AbortSignal } {
  const timeout = AbortSignal.timeout(180000)
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout
  return {
    ...options,
    signal,
    onDeviceState: (state, progress) => {
      if (!signal.aborted) options.onDeviceState?.(state, progress)
    },
  }
}
async function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  signal.throwIfAborted()
  let onAbort: () => void = () => {}
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        onAbort = () =>
          reject(
            new Error('Inference canceled or timed out. No result accepted.'),
          )
        signal.addEventListener('abort', onAbort, { once: true })
      }),
    ])
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}
async function request(
  kind: 'insights' | 'chat',
  context: DatasetContext,
  options: InferenceOptions,
  question?: string,
  history: ConversationTurn[] = [],
) {
  const scoped = requestScope(options)
  scoped.signal.throwIfAborted()
  const prompt = payload(
    context,
    kind === 'chat' ? CHAT_CONTRACT : INSIGHT_CONTRACT,
    question,
    history,
  )
  const { model, cloudModel } = createModel(kind, scoped)
  await abortable(initialize(model, scoped), scoped.signal)
  scoped.signal.throwIfAborted()
  const { response } = await abortable(
    model.generateContent(prompt, { signal: scoped.signal }),
    scoped.signal,
  )
  scoped.signal.throwIfAborted()
  const meta = sourceMetadata(response.inferenceSource, cloudModel)
  if (
    (options.mode === InferenceMode.ONLY_ON_DEVICE &&
      meta.inferenceSource !== InferenceSource.ON_DEVICE) ||
    (options.mode === InferenceMode.ONLY_IN_CLOUD &&
      meta.inferenceSource !== InferenceSource.IN_CLOUD)
  )
    throw new Error(
      'The SDK did not honor the selected inference source. Result discarded.',
    )
  options.onDeviceState?.(
    meta.inferenceSource === InferenceSource.ON_DEVICE
      ? 'ready'
      : 'uninitialized',
  )
  return { text: response.text(), meta }
}
export async function generateInsights(
  context: DatasetContext,
  options: InferenceOptions,
): Promise<InsightReport> {
  const { text, meta } = await request('insights', context, options)
  return {
    ...parseStructuredAIResponse(text, context),
    ...meta,
    requestedMode: options.mode,
    generatedAt: new Date().toISOString(),
    evidence: context.facts,
  }
}
export async function askAssistant(
  context: DatasetContext,
  question: string,
  history: ConversationTurn[],
  options: InferenceOptions,
): Promise<AssistantReply> {
  const { text, meta } = await request(
    'chat',
    context,
    options,
    question,
    history,
  )
  return { ...parseChatResponse(text, context), ...meta }
}
export function explainAIError(error: unknown): string {
  // Provider errors may echo prompts, URLs and keys. Never expose raw provider errors or log them.
  const message = error instanceof Error ? error.message : ''
  if (
    /^(Configure the required|Cloud inference requires|Cloud-capable|Gemini Nano is unavailable|The SDK did not|AI response|The model returned|Keep questions|Aggregate context|Unknown inference|Inference canceled)/.test(
      message,
    )
  )
    return message
  return 'Inference failed. Check browser model support, App Check registration, Firebase AI Logic API enablement, model availability and quota. No data was modified. You can retry or choose on-device only.'
}
