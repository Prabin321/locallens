import type { DatasetProfile } from '../../types/dataset'
import type { DataQualityReport } from '../../types/quality'
import type { CleaningAction } from '../../types/cleaning'

// Prompt injection keyword blocklist — patterns that attempt to override instructions
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above|prior)\s+instructions/i,
  /disregard\s+(previous|all|above|prior)\s+instructions/i,
  /forget\s+(previous|all|above|prior)\s+instructions/i,
  /you\s+are\s+now\s+(a\s+)?(different|new|another)/i,
  /system\s*:/i,
  /assistant\s*:/i,
  /\bprompt\s*injection\b/i,
  /<\|(?:im_start|im_end|system|user|assistant)\|>/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /act\s+as\s+(a\s+)?(different|new|another|unrestricted)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
]

/**
 * Sanitizes user or dataset text to prevent prompt injection attempts.
 * - Strips structural markup brackets
 * - Detects and neutralises common override phrases
 * - Truncates to a safe maximum length
 */
export function sanitizePromptText(text: string, maxLength = 120): string {
  if (!text) return ''

  // Neutralise injection attempts by replacing the whole value with a safe placeholder
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return '[REDACTED:injection-pattern-detected]'
    }
  }

  return text
    .replace(/[<>{}[\]\\]/g, '') // strip potential code/template brackets
    .replace(/`/g, "'") // prevent backtick code execution hints
    .replace(/\$\{[^}]*\}/g, '') // strip JS template literal interpolations
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export interface CompactDatasetContext {
  summaryText: string
  characterCount: number
  hasRawRows: boolean
  disclosedAttributesCount: number
}

/**
 * Builds a privacy-preserving aggregate context representation of the dataset.
 * Zero raw records or individual rows are included.
 */
export function buildPrivacyPreservingContext(
  profile: DatasetProfile,
  qualityReport: DataQualityReport,
  cleaningHistory: CleaningAction[] = [],
  includeOutliers = true,
): CompactDatasetContext {
  const lines: string[] = []

  lines.push(`=== DATASET METADATA ===`)
  lines.push(`Dataset Name: ${sanitizePromptText(profile.fileName)}`)
  lines.push(`Total Rows: ${profile.rowCount}`)
  lines.push(`Total Columns: ${profile.columnCount}`)
  lines.push(`Overall Missingness: ${profile.overallMissingRate}% (${profile.totalNullCells} null cells)`)
  lines.push(
    `Quality Score: ${qualityReport.overallScore}/100 (Completeness: ${qualityReport.dimensions.completeness.score}%, Uniqueness: ${qualityReport.dimensions.uniqueness.score}%, Validity: ${qualityReport.dimensions.validity.score}%, Consistency: ${qualityReport.dimensions.consistency.score}%)`,
  )

  lines.push(`\n=== ATTRIBUTE PROFILES ===`)
  for (const col of profile.columns) {
    const colName = sanitizePromptText(col.name, 40)
    let details = `[${col.type}] ${col.nullPercentage}% null, ${col.uniqueCount} distinct`

    if (col.type === 'number' && col.numericalStats) {
      const { min, max, mean, median, stdDev } = col.numericalStats
      details += ` | min: ${min}, mean: ${mean}, median: ${median}, max: ${max}, stdDev: ${stdDev}`
    } else if (col.categoricalStats && col.categoricalStats.topCategories.length > 0) {
      const topStr = col.categoricalStats.topCategories
        .slice(0, 4)
        .map((c) => `"${sanitizePromptText(c.value, 20)}": ${c.percentage}%`)
        .join(', ')
      details += ` | top: [${topStr}]`
    } else if (col.dateStats) {
      details += ` | range: ${col.dateStats.minDate} to ${col.dateStats.maxDate}`
    }

    lines.push(`• ${colName}: ${details}`)
  }

  if (includeOutliers && qualityReport.outlierValues > 0) {
    lines.push(`\n=== OUTLIER SIGNALS ===`)
    lines.push(`Total potential outliers detected via IQR: ${qualityReport.outlierValues}`)
  }

  if (cleaningHistory.length > 0) {
    lines.push(`\n=== TRANSFORMATIONS APPLIED (${cleaningHistory.length}) ===`)
    for (let i = 0; i < Math.min(cleaningHistory.length, 5); i++) {
      const act = cleaningHistory[i]
      lines.push(
        `• Step ${i + 1}: ${act.type} (${act.affectedRows} rows affected) — ${sanitizePromptText(act.description, 80)}`,
      )
    }
  }

  if (qualityReport.issues.length > 0) {
    lines.push(`\n=== IDENTIFIED QUALITY FLAGS ===`)
    for (const issue of qualityReport.issues.slice(0, 6)) {
      lines.push(
        `• [${issue.severity.toUpperCase()}] ${sanitizePromptText(issue.description, 100)} (Recommendation: ${sanitizePromptText(issue.recommendation, 100)})`,
      )
    }
  }

  const summaryText = lines.join('\n')

  return {
    summaryText,
    characterCount: summaryText.length,
    hasRawRows: false, // strictly zero raw row transmission
    disclosedAttributesCount: profile.columns.length,
  }
}

/**
 * Returns structured system instructions enforcing strict evidence grounding
 * and forbidding hallucinated metrics.
 */
export function getSystemInstructions(): string {
  return `You are LocalLens AI, an expert, objective data scientist assistant grounded in deterministic statistical profiles.
Rules:
1. Base all quantitative conclusions strictly on the provided aggregate statistics.
2. Never invent numbers, correlations, p-values, or relationships not in the context.
3. If evidence is insufficient, state uncertainty clearly.
4. Distinguish observed descriptive statistics from analytical hypotheses.
5. Provide actionable, human-readable explanations of why data quality issues matter and what analytical methods apply.
6. Format output in valid JSON matching the requested schema.`
}
