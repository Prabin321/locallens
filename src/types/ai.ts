import type { InferenceMode, InferenceSource } from 'firebase/ai'

export type ModelReadinessStatus =
  | 'uninitialized'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'unavailable'
  | 'failed'

export interface OnDeviceStatus {
  status: ModelReadinessStatus
  downloadProgress: number // 0 to 1
  errorMessage?: string
  isSupportedBrowser: boolean
}

export interface AIInsightSection {
  title: string
  content: string
  citations: string[]
}

export interface StructuredAIInsights {
  datasetOverview: {
    summary: string
    inferredPurpose: string
    columnRoles: Array<{ column: string; role: string; notes: string }>
  }
  dataQualityAdvisor: {
    criticalConcerns: string[]
    cleaningRecommendations: Array<{
      action: string
      targetColumn?: string
      rationale: string
      riskNote: string
    }>
  }
  analyticalInsights: {
    keyObservations: string[]
    distributionHighlights: string[]
    deltaAfterCleaning?: string
  }
  actionableNextSteps: {
    recommendedAnalyses: string[]
    featureEngineeringIdeas: string[]
  }
  groundingCitations: string[]
  limitations: string[]
  inferenceSource: InferenceSource | 'offline_deterministic'
  modelUsed: string
  generatedAt: string
}

export interface AIChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  inferenceSource?: InferenceSource | 'deterministic'
  citations?: string[]
  isDeterministicMath?: boolean
  error?: boolean
}

export interface CloudPrivacyConsent {
  hasConsented: boolean
  consentedAt?: string
  allowedCloudFallback: boolean
}
