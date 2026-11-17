import type { DatasetProfile } from '../../types/dataset'
import type { DataQualityReport } from '../../types/quality'
import type { CleaningAction } from '../../types/cleaning'

export interface DeterministicQueryResult {
  handled: boolean
  answer?: string
  citations?: string[]
}

export function handleDeterministicQuery(
  question: string,
  profile: DatasetProfile,
  qualityReport: DataQualityReport,
  cleaningHistory: CleaningAction[] = [],
): DeterministicQueryResult {
  const q = question.toLowerCase().trim()

  // 1. Total rows / size
  if (q.includes('how many rows') || q.includes('row count') || q.includes('total rows')) {
    return {
      handled: true,
      answer: `This dataset currently contains **${profile.rowCount.toLocaleString()} rows** and **${profile.columnCount} columns**, totaling **${profile.totalCells.toLocaleString()} data cells**.`,
      citations: [`DatasetProfile: ${profile.rowCount} rows, ${profile.columnCount} columns`],
    }
  }

  // 2. Total columns
  if (q.includes('how many columns') || q.includes('column count') || q.includes('total columns')) {
    const colList = profile.columns.map((c) => `\`${c.name}\` (${c.type})`).join(', ')
    return {
      handled: true,
      answer: `There are **${profile.columnCount} columns**: ${colList}.`,
      citations: [`Schema: ${profile.columnCount} attributes`],
    }
  }

  // 3. Quality score
  if (q.includes('quality score') || q.includes('overall score') || q.includes('data quality')) {
    const { completeness, uniqueness, validity, consistency } = qualityReport.dimensions
    return {
      handled: true,
      answer: `The Overall Data Quality Score is **${qualityReport.overallScore}/100**:\n- **Completeness:** ${completeness.score}% (weight: 35%)\n- **Uniqueness:** ${uniqueness.score}% (weight: 25%)\n- **Validity:** ${validity.score}% (weight: 25%)\n- **Consistency:** ${consistency.score}% (weight: 15%)\n\n*Calculated deterministically using on-device heuristics.*`,
      citations: [
        `DataQualityReport: ${qualityReport.overallScore}/100`,
        `Null Cells: ${qualityReport.nullCells}`,
        `Duplicate Rows: ${qualityReport.duplicateRows}`,
      ],
    }
  }

  // 4. Missing values query
  if (
    q.includes('missing values') ||
    q.includes('null values') ||
    q.includes('most missing') ||
    q.includes('highest null')
  ) {
    const sortedByMissing = [...profile.columns].sort((a, b) => b.nullPercentage - a.nullPercentage)
    const topMissing = sortedByMissing.filter((c) => c.nullCount > 0)

    if (topMissing.length === 0) {
      return {
        handled: true,
        answer: `Great news: there are **0 missing or null values** in this dataset across all ${profile.columnCount} columns.`,
        citations: ['DatasetProfile: 0 null cells'],
      }
    }

    const details = topMissing
      .slice(0, 5)
      .map((c) => `- **${c.name}**: ${c.nullCount} missing (${c.nullPercentage}%)`)
      .join('\n')

    return {
      handled: true,
      answer: `The dataset has **${profile.totalNullCells} missing cells** (${profile.overallMissingRate}% overall).\n\nColumns with highest missingness:\n${details}`,
      citations: topMissing.map((c) => `${c.name}: ${c.nullCount} nulls (${c.nullPercentage}%)`),
    }
  }

  // 5. Duplicates query
  if (q.includes('duplicate') || q.includes('duplicates')) {
    return {
      handled: true,
      answer: `Duplicate analysis shows **${qualityReport.duplicateRows} duplicate rows** (${qualityReport.dimensions.uniqueness.metricDetails}).`,
      citations: [`Uniqueness Metric: ${qualityReport.duplicateRows} duplicates`],
    }
  }

  // 6. Transformations / Cleaning history
  if (q.includes('what changed') || q.includes('cleaning history') || q.includes('transformations')) {
    if (cleaningHistory.length === 0) {
      return {
        handled: true,
        answer: 'No cleaning transformations have been applied to this dataset yet. You are currently viewing the raw upload.',
        citations: ['CleaningHistory: 0 actions'],
      }
    }

    const steps = cleaningHistory
      .map(
        (act, idx) =>
          `**${idx + 1}. ${act.type}**: ${act.description} (${act.affectedRows} rows modified)`,
      )
      .join('\n')

    return {
      handled: true,
      answer: `A total of **${cleaningHistory.length} cleaning operations** were executed:\n\n${steps}`,
      citations: cleaningHistory.map((a) => a.description),
    }
  }

  // 7. Column specific statistical summary check
  for (const col of profile.columns) {
    if (q.includes(col.name.toLowerCase())) {
      if (
        (q.includes('mean') || q.includes('average') || q.includes('median') || q.includes('distribution')) &&
        col.type === 'number' &&
        col.numericalStats
      ) {
        const { min, max, mean, median, stdDev } = col.numericalStats
        const skew =
          mean > median
            ? 'right-skewed (positive skew, pulled by higher values)'
            : mean < median
              ? 'left-skewed (negative skew, pulled by lower values)'
              : 'approximately symmetric'

        return {
          handled: true,
          answer: `Statistical summary for **\`${col.name}\`**:\n- **Mean:** ${mean}\n- **Median:** ${median}\n- **Min:** ${min}\n- **Max:** ${max}\n- **Std Dev:** ${stdDev}\n\n*Distribution Note:* The mean is ${mean > median ? 'greater than' : mean < median ? 'less than' : 'equal to'} the median, indicating a ${skew} distribution.`,
          citations: [
            `${col.name} NumericalStats: mean=${mean}, median=${median}, min=${min}, max=${max}`,
          ],
        }
      }
    }
  }

  return { handled: false }
}
