import { Schema } from 'firebase/ai'
import type {
  AssistantReply,
  DatasetContext,
  GroundedClaim,
  InsightContent,
} from '../../types/ai'

const claimSchema = () =>
  Schema.object({
    properties: {
      text: Schema.string(),
      evidence: Schema.array({ items: Schema.string() }),
    },
  })
export const insightSchema = Schema.object({
  properties: {
    summary: claimSchema(),
    quality: Schema.array({ items: claimSchema() }),
    insights: Schema.array({ items: claimSchema() }),
    recommendations: Schema.array({
      items: Schema.object({
        properties: {
          text: Schema.string(),
          evidence: Schema.array({ items: Schema.string() }),
          risk: Schema.string(),
        },
      }),
    }),
    nextSteps: Schema.array({ items: claimSchema() }),
    limitations: Schema.array({ items: Schema.string() }),
  },
})
export const chatSchema = Schema.object({
  properties: {
    answer: claimSchema(),
    followUps: Schema.array({ items: Schema.string() }),
  },
})
export const INSIGHT_CONTRACT =
  '{summary:{text:string,evidence:string[]},quality:[{text:string,evidence:string[]}],insights:[{text:string,evidence:string[]}],recommendations:[{text:string,evidence:string[],risk:string}],nextSteps:[{text:string,evidence:string[]}],limitations:string[]}'
export const CHAT_CONTRACT =
  '{answer:{text:string,evidence:string[]},followUps:string[]}'

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid AI response object.')
  return value as Record<string, unknown>
}
function string(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 3000)
    throw new Error('Invalid AI response text.')
  return value
}
function array<T>(value: unknown, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > 20)
    throw new Error('Invalid AI response list.')
  return value.map(parse)
}
function json(raw: string): Record<string, unknown> {
  if (raw.length > 60000) throw new Error('AI response exceeds size limit.')
  try {
    return record(
      JSON.parse(
        raw
          .trim()
          .replace(/^```(?:json)?\s*/, '')
          .replace(/\s*```$/, ''),
      ),
    )
  } catch {
    throw new Error(
      'The model returned invalid JSON. No insights were accepted; try again.',
    )
  }
}
function claim(value: unknown, context: DatasetContext): GroundedClaim {
  const obj = record(value)
  const evidence = array(obj.evidence, string)
  if (
    !evidence.length ||
    evidence.some((id) => !context.facts.some((f) => f.id === id))
  )
    throw new Error('AI response has missing or unknown evidence references.')
  return { text: string(obj.text), evidence }
}
export function parseStructuredAIResponse(
  raw: string,
  context: DatasetContext,
): InsightContent {
  const obj = json(raw)
  return {
    summary: claim(obj.summary, context),
    quality: array(obj.quality, (v) => claim(v, context)),
    insights: array(obj.insights, (v) => claim(v, context)),
    recommendations: array(obj.recommendations, (v) => ({
      ...claim(v, context),
      risk: string(record(v).risk),
    })),
    nextSteps: array(obj.nextSteps, (v) => claim(v, context)),
    limitations: array(obj.limitations, string),
  }
}
export function parseChatResponse(
  raw: string,
  context: DatasetContext,
): Pick<AssistantReply, 'answer' | 'followUps'> {
  const obj = json(raw)
  return {
    answer: claim(obj.answer, context),
    followUps: array(obj.followUps, string).slice(0, 4),
  }
}
