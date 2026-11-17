import type { InferenceSource } from 'firebase/ai'
import type { StructuredAIInsights } from '../../types/ai'

export function cleanJsonMarkdown(text: string): string {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '')
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '')
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/, '')
  }
  return cleaned.trim()
}

export function parseStructuredAIResponse(
  rawText: string,
  inferenceSource: InferenceSource | 'offline_deterministic',
  modelUsed: string,
): StructuredAIInsights {
  const cleaned = cleanJsonMarkdown(rawText)

  try {
    const parsed = JSON.parse(cleaned)

    return {
      datasetOverview: {
        summary: parsed.datasetOverview?.summary || 'Dataset analysis successfully compiled.',
        inferredPurpose:
          parsed.datasetOverview?.inferredPurpose || 'General domain tabular exploration.',
        columnRoles: Array.isArray(parsed.datasetOverview?.columnRoles)
          ? parsed.datasetOverview.columnRoles
          : [],
      },
      dataQualityAdvisor: {
        criticalConcerns: Array.isArray(parsed.dataQualityAdvisor?.criticalConcerns)
          ? parsed.dataQualityAdvisor.criticalConcerns
          : [],
        cleaningRecommendations: Array.isArray(parsed.dataQualityAdvisor?.cleaningRecommendations)
          ? parsed.dataQualityAdvisor.cleaningRecommendations
          : [],
      },
      analyticalInsights: {
        keyObservations: Array.isArray(parsed.analyticalInsights?.keyObservations)
          ? parsed.analyticalInsights.keyObservations
          : [],
        distributionHighlights: Array.isArray(parsed.analyticalInsights?.distributionHighlights)
          ? parsed.analyticalInsights.distributionHighlights
          : [],
        deltaAfterCleaning: parsed.analyticalInsights?.deltaAfterCleaning,
      },
      actionableNextSteps: {
        recommendedAnalyses: Array.isArray(parsed.actionableNextSteps?.recommendedAnalyses)
          ? parsed.actionableNextSteps.recommendedAnalyses
          : [],
        featureEngineeringIdeas: Array.isArray(parsed.actionableNextSteps?.featureEngineeringIdeas)
          ? parsed.actionableNextSteps.featureEngineeringIdeas
          : [],
      },
      groundingCitations: Array.isArray(parsed.groundingCitations)
        ? parsed.groundingCitations
        : ['Deterministic DatasetProfile', 'DataQualityReport'],
      limitations: Array.isArray(parsed.limitations)
        ? parsed.limitations
        : ['Descriptive aggregate inferences only. Causal effects require experimental verification.'],
      inferenceSource,
      modelUsed,
      generatedAt: new Date().toISOString(),
    }
  } catch {
    // Graceful fallback for non-JSON or unstructured responses
    return {
      datasetOverview: {
        summary: rawText.slice(0, 300) + '...',
        inferredPurpose: 'Tabular dataset profiling.',
        columnRoles: [],
      },
      dataQualityAdvisor: {
        criticalConcerns: ['Structured JSON parsing fallback engaged.'],
        cleaningRecommendations: [],
      },
      analyticalInsights: {
        keyObservations: [rawText.slice(0, 500)],
        distributionHighlights: [],
      },
      actionableNextSteps: {
        recommendedAnalyses: ['Exploratory statistical validation'],
        featureEngineeringIdeas: [],
      },
      groundingCitations: ['DatasetProfile'],
      limitations: ['Model response produced unstructured text.'],
      inferenceSource,
      modelUsed,
      generatedAt: new Date().toISOString(),
    }
  }
}
