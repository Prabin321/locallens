import { describe, it, expect } from 'vitest'
import {
  findDuplicateRows,
  removeDuplicateRows,
  imputeMissing,
  dropMissingRows,
  dropColumn,
  detectOutliers,
  treatOutliers,
  trimWhitespace,
  normalizeCapitalization,
  replaceCategoryValues,
  detectInconsistentCategories,
  convertColumnType,
  validateRules,
  sanitizeCSVValue,
  exportToSafeCSV,
} from './cleaner'

describe('Duplicate Detection & Removal', () => {
  const headers = ['id', 'email', 'name']
  const rows = [
    { id: 1, email: 'alice@example.com', name: 'Alice' },
    { id: 2, email: 'bob@example.com', name: 'Bob' },
    { id: 1, email: 'alice@example.com', name: 'Alice' }, // exact duplicate of row 0
    { id: 3, email: 'bob@example.com', name: 'Bobby' }, // duplicate email with row 1
  ]

  it('detects exact duplicate rows across all columns', () => {
    const res = findDuplicateRows(headers, rows)
    expect(res.duplicateCount).toBe(2) // rows 0 and 2
    expect(res.groups.length).toBe(1)
    expect(res.groups[0].indices).toEqual([0, 2])
  })

  it('detects key-based duplicates on selected columns', () => {
    const res = findDuplicateRows(headers, rows, ['email'])
    // Both Alice (0, 2) and Bob (1, 3) are duplicate email groups
    expect(res.groups.length).toBe(2)
  })

  it('removes duplicates using keep_first strategy', () => {
    const { rows: cleaned, removedCount } = removeDuplicateRows(
      headers,
      rows,
      headers,
      'keep_first',
    )
    expect(removedCount).toBe(1)
    expect(cleaned.length).toBe(3)
    expect(cleaned[0].name).toBe('Alice')
    expect(cleaned[1].name).toBe('Bob')
    expect(cleaned[2].name).toBe('Bobby')
  })

  it('removes duplicates using keep_last strategy', () => {
    const { rows: cleaned, removedCount } = removeDuplicateRows(
      headers,
      rows,
      headers,
      'keep_last',
    )
    expect(removedCount).toBe(1)
    expect(cleaned.length).toBe(3)
  })

  it('removes all duplicate occurrences with remove_all strategy', () => {
    const { rows: cleaned, removedCount } = removeDuplicateRows(
      headers,
      rows,
      headers,
      'remove_all',
    )
    expect(removedCount).toBe(2)
    expect(cleaned.length).toBe(2)
    expect(cleaned.map((r) => r.name)).toEqual(['Bob', 'Bobby'])
  })

  it('handles null values in keys according to ignoreNullKeys setting', () => {
    const rowsWithNulls = [
      { id: 1, key: null },
      { id: 2, key: null },
    ]
    const withNullsMatch = findDuplicateRows(['id', 'key'], rowsWithNulls, ['key'], false)
    expect(withNullsMatch.duplicateCount).toBe(2)

    const withNullsIgnored = findDuplicateRows(['id', 'key'], rowsWithNulls, ['key'], true)
    expect(withNullsIgnored.duplicateCount).toBe(0)
  })
})

describe('Missing-Value Imputation & Removal', () => {
  const rows = [
    { name: 'Alice', age: 20, dept: 'Engineering' },
    { name: 'Bob', age: 30, dept: null },
    { name: 'Charlie', age: null, dept: 'Engineering' },
    { name: 'David', age: 40, dept: 'Marketing' },
  ]

  it('imputes mean correctly on numerical column', () => {
    // Valid ages: 20, 30, 40 -> mean = 30
    const { rows: imputed, imputedCount } = imputeMissing(rows, 'age', 'mean', 'number')
    expect(imputedCount).toBe(1)
    expect(imputed[2].age).toBe(30)
  })

  it('imputes median correctly on numerical column', () => {
    const { rows: imputed, imputedCount } = imputeMissing(rows, 'age', 'median', 'number')
    expect(imputedCount).toBe(1)
    expect(imputed[2].age).toBe(30)
  })

  it('imputes mode on categorical column', () => {
    // Valid depts: Engineering (2), Marketing (1) -> mode = Engineering
    const { rows: imputed, imputedCount } = imputeMissing(rows, 'dept', 'mode', 'string')
    expect(imputedCount).toBe(1)
    expect(imputed[1].dept).toBe('Engineering')
  })

  it('imputes constant value', () => {
    const { rows: imputed } = imputeMissing(rows, 'dept', 'constant', 'string', 'Unassigned')
    expect(imputed[1].dept).toBe('Unassigned')
  })

  it('imputes forward-fill and backward-fill', () => {
    const ffillRes = imputeMissing(rows, 'dept', 'ffill', 'string')
    expect(ffillRes.rows[1].dept).toBe('Engineering') // filled from Alice

    const bfillRes = imputeMissing(rows, 'dept', 'bfill', 'string')
    expect(bfillRes.rows[1].dept).toBe('Engineering') // filled from Charlie
  })

  it('rejects mathematical imputation on categorical column', () => {
    expect(() => imputeMissing(rows, 'dept', 'mean', 'string')).toThrow()
  })

  it('drops rows with missing values in column', () => {
    const { rows: dropped, droppedCount } = dropMissingRows(rows, 'dept')
    expect(droppedCount).toBe(1)
    expect(dropped.length).toBe(3)
  })

  it('drops column completely', () => {
    const { headers: newHeaders, rows: newRows } = dropColumn(
      ['name', 'age', 'dept'],
      rows,
      'dept',
    )
    expect(newHeaders).toEqual(['name', 'age'])
    expect(newRows[0].dept).toBeUndefined()
  })
})

describe('Outlier Detection & Treatment', () => {
  const rows = [
    { val: 10 },
    { val: 12 },
    { val: 11 },
    { val: 13 },
    { val: 12 },
    { val: 14 },
    { val: 11 },
    { val: 100 }, // extreme outlier
  ]

  it('detects outliers using IQR method', () => {
    const res = detectOutliers(rows, 'val', 'iqr', 1.5)
    expect(res.count).toBe(1)
    expect(res.outlierIndices.has(7)).toBe(true)
    expect(res.upperBound).toBeLessThan(100)
  })

  it('detects outliers using Z-score method', () => {
    const res = detectOutliers(rows, 'val', 'zscore', 2.0)
    expect(res.count).toBe(1)
    expect(res.outlierIndices.has(7)).toBe(true)
  })

  it('treats outliers with capping (Winsorization)', () => {
    const { rows: capped, affectedCount } = treatOutliers(rows, 'val', 'iqr', 'cap', 1.5)
    expect(affectedCount).toBe(1)
    expect(capped[7].val).toBeLessThan(100)
  })

  it('treats outliers with row removal', () => {
    const { rows: removed, affectedCount } = treatOutliers(rows, 'val', 'iqr', 'remove', 1.5)
    expect(affectedCount).toBe(1)
    expect(removed.length).toBe(7)
  })
})

describe('Text Cleaning & Categorical Normalization', () => {
  it('trims leading and trailing whitespace', () => {
    const rows = [{ name: '  Alice  ' }, { name: 'Bob' }]
    const { rows: cleaned, affectedCount } = trimWhitespace(rows, 'name')
    expect(affectedCount).toBe(1)
    expect(cleaned[0].name).toBe('Alice')
  })

  it('normalizes capitalization to Title Case, lower, and upper', () => {
    const rows = [{ city: 'new york' }]
    const titleRes = normalizeCapitalization(rows, 'city', 'title')
    expect(titleRes.rows[0].city).toBe('New York')

    const upperRes = normalizeCapitalization(rows, 'city', 'upper')
    expect(upperRes.rows[0].city).toBe('NEW YORK')
  })

  it('detects inconsistent category casings', () => {
    const rows = [
      { dept: 'Engineering' },
      { dept: 'engineering' },
      { dept: 'Marketing' },
      { dept: 'ENGINEERING' },
    ]
    const inconsistent = detectInconsistentCategories(rows, 'dept')
    expect(inconsistent.length).toBe(1)
    expect(inconsistent[0].normalized).toBe('engineering')
    expect(inconsistent[0].variants.length).toBe(3)
  })

  it('replaces category values accurately', () => {
    const rows = [{ status: 'NYC' }, { status: 'SF' }]
    const { rows: replaced } = replaceCategoryValues(rows, 'status', 'NYC', 'New York')
    expect(replaced[0].status).toBe('New York')
  })
})

describe('Type Conversion & Validation Rules', () => {
  it('converts types safely with fallback', () => {
    const rows = [{ age: '25' }, { age: 'invalid' }]
    const res = convertColumnType(rows, 'age', 'number', 'null')
    expect(res.convertedCount).toBe(1)
    expect(res.failedCount).toBe(1)
    expect(res.rows[0].age).toBe(25)
    expect(res.rows[1].age).toBeNull()
  })

  it('enforces validation rules (range, allowed values, required)', () => {
    const rows = [
      { score: 120, tier: 'Diamond', email: null },
      { score: 85, tier: 'Gold', email: 'test@example.com' },
    ]
    const rules = [
      {
        id: 'r1',
        column: 'score',
        ruleType: 'range' as const,
        min: 0,
        max: 100,
        description: 'Score 0-100',
      },
      {
        id: 'r2',
        column: 'tier',
        ruleType: 'allowed_values' as const,
        allowedValues: ['Bronze', 'Silver', 'Gold'],
        description: 'Allowed tiers',
      },
      {
        id: 'r3',
        column: 'email',
        ruleType: 'required' as const,
        description: 'Email required',
      },
    ]

    const { violations, violationCount } = validateRules(rows, rules)
    expect(violationCount).toBe(3) // score 120 > 100, Diamond not allowed, email null
    expect(violations.some((v) => v.column === 'score')).toBe(true)
    expect(violations.some((v) => v.column === 'tier')).toBe(true)
    expect(violations.some((v) => v.column === 'email')).toBe(true)
  })
})

describe('CSV Injection Mitigation (CWE-1236)', () => {
  it('neutralizes spreadsheet formula triggers by prepending single quote', () => {
    expect(sanitizeCSVValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
    expect(sanitizeCSVValue('+12345')).toBe("'+12345")
    expect(sanitizeCSVValue('-10')).toBe("'-10")
    expect(sanitizeCSVValue('@cmd')).toBe("'@cmd")
    expect(sanitizeCSVValue('Safe Value')).toBe('Safe Value')
  })

  it('exports safe CSV string', () => {
    const headers = ['cmd', 'value']
    const rows = [{ cmd: '=1+1', value: 'Test' }]
    const csv = exportToSafeCSV(headers, rows)
    expect(csv).toContain("'=1+1")
  })
})
