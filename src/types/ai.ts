import type { InferenceMode, InferenceSource } from 'firebase/ai'

export interface EvidenceFact {
  id: string
  label: string
  value: number | string
}
export interface DatasetContext {
  version: 1
  facts: EvidenceFact[]
  omittedColumns: number
  policy: string
}
export interface GroundedClaim {
  text: string
  evidence: string[]
}
export interface InsightContent {
  summary: GroundedClaim
  quality: GroundedClaim[]
  insights: GroundedClaim[]
  recommendations: Array<GroundedClaim & { risk: string }>
  nextSteps: GroundedClaim[]
  limitations: string[]
}
export interface InsightReport extends InsightContent {
  inferenceSource: InferenceSource
  modelUsed: string
  requestedMode: InferenceMode
  generatedAt: string
  evidence: EvidenceFact[]
}
export interface AssistantReply {
  answer: GroundedClaim
  followUps: string[]
  inferenceSource: InferenceSource
  modelUsed: string
}
export interface ConversationTurn {
  question: string
  answer: string
}
export type DeviceState =
  | 'uninitialized'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'unavailable'
