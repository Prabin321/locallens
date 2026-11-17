import { describe, it, expect } from 'vitest'
import { assessDataQuality, generateQualityReportMarkdown } from './quality'
import type { ColumnProfile } from '../types/dataset'

describe('Data Quality Assessment Engine', () => {
  const headers = ['id', 'name', 'salary', 'department']
  const rows = [
    { id: 1, name: 'Alice', salary: 100000, department: 'Engineering' },
    { id: 2, name: 'Bob', salary: 90000, department: 'engineering' }, // inconsistent casing
    { id: 3, name: 'Charlie', salary: null, department: 'Sales' }, // null value
    { id: 1, name: 'Alice', salary: 100000, department: 'Engineering' }, // exact duplicate
  ]

  const columnProfiles: ColumnProfile[] = [
    {
      name: 'id',
      type: 'number',
      totalCount: 4,
      validCount: 4,
      nullCount: 0,
      nullPercentage: 0,
      uniqueCount: 3,
    },
    {
      name: 'name',
      type: 'string',
      totalCount: 4,
      validCount: 4,
      nullCount: 0,
      nullPercentage: 0,
      uniqueCount: 3,
    },
    {
      name: 'salary',
      type: 'number',
      totalCount: 4,
      validCount: 3,
      nullCount: 1,
      nullPercentage: 25,
      uniqueCount: 2,
    },
    {
      name: 'department',
      type: 'string',
      totalCount: 4,
      validCount: 4,
      nullCount: 0,
      nullPercentage: 0,
      uniqueCount: 3,
    },
  ]

  it('calculates transparent quality scores across dimensions', () => {
    const report = assessDataQuality(headers, rows, columnProfiles, 'test.csv')

    expect(report.rowCount).toBe(4)
    expect(report.columnCount).toBe(4)
    expect(report.totalCells).toBe(16)
    expect(report.nullCells).toBe(1)
    expect(report.duplicateRows).toBe(2) // 2 rows involved in duplicate group

    // Completeness: 15 / 16 = 93.8%
    expect(report.dimensions.completeness.score).toBeCloseTo(93.8, 0)

    // Uniqueness: 2 / 4 = 50.0%
    expect(report.dimensions.uniqueness.score).toBe(50.0)

    // Overall weighted score
    expect(report.overallScore).toBeGreaterThan(0)
    expect(report.overallScore).toBeLessThanOrEqual(100)

    // Issues identified
    expect(report.issues.length).toBeGreaterThan(0)
    expect(report.issues.some((i) => i.category === 'uniqueness')).toBe(true)
    expect(report.issues.some((i) => i.category === 'completeness')).toBe(true)
  })

  it('prepares structured AI readiness context for future Firebase AI Logic', () => {
    const report = assessDataQuality(headers, rows, columnProfiles, 'test.csv')

    expect(report.aiReadiness.schemaSummary.length).toBe(4)
    expect(report.aiReadiness.identifiedAnomalies.length).toBe(report.issues.length)
    expect(report.aiReadiness.recommendedTransformations.length).toBe(report.issues.length)
  })

  it('generates markdown export with scoring breakdown', () => {
    const report = assessDataQuality(headers, rows, columnProfiles, 'test.csv')
    const md = generateQualityReportMarkdown(report)

    expect(md).toContain('# LocalLens — Data Quality Assessment Report')
    expect(md).toContain('Completeness')
    expect(md).toContain('Uniqueness')
    expect(md).toContain('Firebase AI Logic Payload')
  })
})
