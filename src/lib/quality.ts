import type { ColumnProfile } from '../types/dataset'
import type { DataQualityReport, QualityIssue } from '../types/quality'
import {
  detectInconsistentCategories,
  detectOutliers,
  findDuplicateRows,
} from './cleaner'
import { isNullValue } from './profiler'

export function assessDataQuality(
  headers: string[],
  rows: Record<string, unknown>[],
  columnProfiles: ColumnProfile[],
  datasetName = 'dataset.csv',
): DataQualityReport {
  const rowCount = rows.length
  const columnCount = headers.length
  const totalCells = Math.max(rowCount * columnCount, 1)

  // 1. Completeness Evaluation
  let nullCells = 0
  for (const r of rows) {
    for (const h of headers) {
      if (isNullValue(r[h])) {
        nullCells++
      }
    }
  }
  const completenessRate = Math.max(0, 1 - nullCells / totalCells)
  const completenessScore = Number((completenessRate * 100).toFixed(1))

  // 2. Uniqueness Evaluation
  const dupResult = findDuplicateRows(headers, rows)
  const duplicateRows = dupResult.duplicateCount
  const uniquenessRate = rowCount > 0 ? Math.max(0, 1 - duplicateRows / rowCount) : 1
  const uniquenessScore = Number((uniquenessRate * 100).toFixed(1))

  // 3. Validity Evaluation (Outliers + Invalid Type Mismatches)
  let outlierCount = 0
  let invalidTypeCount = 0

  for (const col of columnProfiles) {
    if (col.type === 'number') {
      const outliers = detectOutliers(rows, col.name, 'iqr', 1.5)
      outlierCount += outliers.count
    }
    // Check type mismatches against inferred column type
    for (const r of rows) {
      const v = r[col.name]
      if (!isNullValue(v)) {
        const str = String(v).trim()
        if (col.type === 'number') {
          const num = Number(str.replace(/,/g, ''))
          if (isNaN(num)) invalidTypeCount++
        } else if (col.type === 'boolean') {
          const lower = str.toLowerCase()
          if (lower !== 'true' && lower !== 'false') invalidTypeCount++
        } else if (col.type === 'date') {
          const ts = Date.parse(str)
          if (isNaN(ts)) invalidTypeCount++
        }
      }
    }
  }

  const invalidTotal = invalidTypeCount + Math.floor(outlierCount * 0.5) // weighted impact
  const validityRate = Math.max(0, 1 - invalidTotal / totalCells)
  const validityScore = Number((validityRate * 100).toFixed(1))

  // 4. Consistency Evaluation (Inconsistent Casing / Category Variants)
  let inconsistentVariantCount = 0
  for (const col of columnProfiles) {
    if (col.type === 'string') {
      const groups = detectInconsistentCategories(rows, col.name)
      for (const g of groups) {
        inconsistentVariantCount += g.variants.length
      }
    }
  }

  const consistencyRate = Math.max(0, 1 - inconsistentVariantCount / totalCells)
  const consistencyScore = Number((consistencyRate * 100).toFixed(1))

  // Overall Weighted Score: 35% Completeness + 25% Uniqueness + 25% Validity + 15% Consistency
  const overallScore = Number(
    (
      completenessScore * 0.35 +
      uniquenessScore * 0.25 +
      validityScore * 0.25 +
      consistencyScore * 0.15
    ).toFixed(1),
  )

  // Quality Issues Identification
  const issues: QualityIssue[] = []

  // Check critical missingness
  for (const col of columnProfiles) {
    if (col.nullPercentage > 40) {
      issues.push({
        id: `missing-${col.name}`,
        severity: 'critical',
        category: 'completeness',
        column: col.name,
        description: `Column '${col.name}' has excessive missingness (${col.nullPercentage}% null).`,
        affectedCount: col.nullCount,
        recommendation:
          'High risk of bias if imputed mathematically. Consider dropping the column or collecting additional data.',
      })
    } else if (col.nullPercentage > 5) {
      issues.push({
        id: `missing-${col.name}`,
        severity: 'warning',
        category: 'completeness',
        column: col.name,
        description: `Column '${col.name}' has ${col.nullPercentage}% missing values.`,
        affectedCount: col.nullCount,
        recommendation:
          col.type === 'number'
            ? 'Consider median imputation for skewed distributions or mean if normally distributed.'
            : 'Consider mode or constant category imputation.',
      })
    }
  }

  // Check duplicates
  if (duplicateRows > 0) {
    issues.push({
      id: 'duplicates-found',
      severity: duplicateRows / rowCount > 0.1 ? 'critical' : 'warning',
      category: 'uniqueness',
      description: `Found ${duplicateRows} duplicate records (${dupResult.duplicatePercentage}% of dataset).`,
      affectedCount: duplicateRows,
      recommendation:
        'Inspect duplicate groups. Verify whether identical rows represent genuine duplicates or recurring legitimate transactions.',
    })
  }

  // Check outliers
  for (const col of columnProfiles) {
    if (col.type === 'number') {
      const outliers = detectOutliers(rows, col.name, 'iqr', 1.5)
      if (outliers.count > 0) {
        issues.push({
          id: `outliers-${col.name}`,
          severity: outliers.count / rowCount > 0.1 ? 'warning' : 'info',
          category: 'validity',
          column: col.name,
          description: `Detected ${outliers.count} potential numerical outliers in '${col.name}' outside [${outliers.lowerBound}, ${outliers.upperBound}].`,
          affectedCount: outliers.count,
          recommendation:
            'Inspect extreme observations. Use Winsorization/capping to preserve record count if values are legitimate.',
        })
      }
    }
  }

  // Check inconsistent categories
  for (const col of columnProfiles) {
    if (col.type === 'string') {
      const groups = detectInconsistentCategories(rows, col.name)
      if (groups.length > 0) {
        const variantCount = groups.reduce((acc, g) => acc + g.variants.length, 0)
        issues.push({
          id: `inconsistent-${col.name}`,
          severity: 'warning',
          category: 'consistency',
          column: col.name,
          description: `Column '${col.name}' contains ${groups.length} inconsistent category groups (${variantCount} variants with differing case/whitespace).`,
          affectedCount: variantCount,
          recommendation:
            'Apply case normalization (e.g. Title Case or lowercase) and whitespace trimming to merge identical categories.',
        })
      }
    }
  }

  // Structured AI readiness context for future Firebase AI Logic
  const aiReadiness = {
    schemaSummary: columnProfiles.map((c) => ({
      column: c.name,
      type: c.type,
      nullRate: c.nullPercentage,
      uniqueCount: c.uniqueCount,
    })),
    identifiedAnomalies: issues.map((i) => `[${i.severity.toUpperCase()}] ${i.description}`),
    recommendedTransformations: issues.map((i) => i.recommendation),
  }

  return {
    datasetName,
    generatedAt: new Date().toISOString(),
    rowCount,
    columnCount,
    totalCells,
    overallScore,
    dimensions: {
      completeness: {
        name: 'Completeness',
        score: completenessScore,
        weight: 0.35,
        description: 'Proportion of non-null and non-empty data cells across all attributes.',
        formula: '100 × (1 - nullCells / totalCells)',
        metricDetails: `${(totalCells - nullCells).toLocaleString()} / ${totalCells.toLocaleString()} cells populated (${nullCells.toLocaleString()} missing)`,
      },
      uniqueness: {
        name: 'Uniqueness',
        score: uniquenessScore,
        weight: 0.25,
        description: 'Proportion of unique, non-duplicated rows in the dataset.',
        formula: '100 × (1 - duplicateRows / totalRows)',
        metricDetails: `${(rowCount - duplicateRows).toLocaleString()} / ${rowCount.toLocaleString()} unique rows (${duplicateRows.toLocaleString()} duplicate rows)`,
      },
      validity: {
        name: 'Validity',
        score: validityScore,
        weight: 0.25,
        description: 'Proportion of records matching expected data types and statistical boundaries.',
        formula: '100 × (1 - (invalidTypes + 0.5 × outliers) / totalCells)',
        metricDetails: `${outlierCount} outliers and ${invalidTypeCount} type mismatches detected`,
      },
      consistency: {
        name: 'Consistency',
        score: consistencyScore,
        weight: 0.15,
        description: 'Uniformity of categorical naming conventions and formatting.',
        formula: '100 × (1 - inconsistentVariants / totalCells)',
        metricDetails: `${inconsistentVariantCount} inconsistent text variants detected across categories`,
      },
    },
    nullCells,
    duplicateRows,
    outlierValues: outlierCount,
    invalidValues: invalidTypeCount,
    inconsistentCategoryCount: inconsistentVariantCount,
    issues,
    aiReadiness,
  }
}

export function generateQualityReportMarkdown(report: DataQualityReport): string {
  return `# LocalLens — Data Quality Assessment Report

> **Dataset:** \`${report.datasetName}\`  
> **Generated:** ${new Date(report.generatedAt).toLocaleString()}  
> **Rows:** ${report.rowCount.toLocaleString()} | **Columns:** ${report.columnCount} | **Total Cells:** ${report.totalCells.toLocaleString()}  
> **Overall Data Quality Score:** **${report.overallScore} / 100**

---

## 📊 Dimension Scores & Formulas

| Dimension | Score | Weight | Formula | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Completeness** | ${report.dimensions.completeness.score}% | 35% | \`${report.dimensions.completeness.formula}\` | ${report.dimensions.completeness.metricDetails} |
| **Uniqueness** | ${report.dimensions.uniqueness.score}% | 25% | \`${report.dimensions.uniqueness.formula}\` | ${report.dimensions.uniqueness.metricDetails} |
| **Validity** | ${report.dimensions.validity.score}% | 25% | \`${report.dimensions.validity.formula}\` | ${report.dimensions.validity.metricDetails} |
| **Consistency** | ${report.dimensions.consistency.score}% | 15% | \`${report.dimensions.consistency.formula}\` | ${report.dimensions.consistency.metricDetails} |

*Disclaimer: Quality scores are heuristic guides calculated deterministically on-device without cloud telemetry.*

---

## ⚠️ Identified Issues & Recommended Actions (${report.issues.length})

${
  report.issues.length === 0
    ? '✅ No critical data quality issues identified.'
    : report.issues
        .map(
          (issue, idx) => `### ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.description}
* **Category:** ${issue.category} ${issue.column ? `| **Column:** \`${issue.column}\`` : ''}
* **Affected Records:** ${issue.affectedCount}
* **Recommendation:** ${issue.recommendation}
`,
        )
        .join('\n')
}

---

## 🤖 Firebase AI Logic Payload (Prepared Context)

\`\`\`json
${JSON.stringify(report.aiReadiness, null, 2)}
\`\`\`

---
*Generated by LocalLens — #BuildHybridAI 2026 Devpost Hackathon*
`
}
