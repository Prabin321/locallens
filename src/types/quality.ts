export interface QualityDimension {
  name: string
  score: number // 0 to 100
  weight: number // 0 to 1
  description: string
  formula: string
  metricDetails: string
}

export type QualityIssueSeverity = 'critical' | 'warning' | 'info'

export interface QualityIssue {
  id: string
  severity: QualityIssueSeverity
  category: 'completeness' | 'uniqueness' | 'validity' | 'consistency'
  column?: string
  description: string
  affectedCount: number
  recommendation: string
}

export interface DataQualityReport {
  datasetName: string
  generatedAt: string
  rowCount: number
  columnCount: number
  totalCells: number

  // Core scores
  overallScore: number // 0 to 100
  dimensions: {
    completeness: QualityDimension
    uniqueness: QualityDimension
    validity: QualityDimension
    consistency: QualityDimension
  }

  // Raw counts
  nullCells: number
  duplicateRows: number
  outlierValues: number
  invalidValues: number
  inconsistentCategoryCount: number

  // Detected issues
  issues: QualityIssue[]

  // AI Readiness Payload (Structured context for future Firebase Hybrid AI)
  aiReadiness: {
    schemaSummary: Array<{
      column: string
      type: string
      nullRate: number
      uniqueCount: number
    }>
    identifiedAnomalies: string[]
    recommendedTransformations: string[]
  }
}
