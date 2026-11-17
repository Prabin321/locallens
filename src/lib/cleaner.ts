import Papa from 'papaparse'
import type {
  CaseNormalization,
  DuplicateStrategy,
  ImputationStrategy,
  InconsistentCategoryGroup,
  OutlierMethod,
  OutlierTreatment,
  RuleViolation,
  ValidationRule,
} from '../types/cleaning'
import type { ColumnType } from '../types/dataset'
import { isNullValue } from './profiler'

/**
 * --------------------------------------------------------------------------
 * 1. DUPLICATE DETECTION & REMOVAL
 * --------------------------------------------------------------------------
 */

export interface DuplicateDetectionResult {
  duplicateCount: number
  duplicatePercentage: number
  groups: Array<{ key: string; indices: number[] }>
  duplicateRowIndices: Set<number>
}

/**
 * Detects exact duplicates across all columns or key-based duplicates across selected columns.
 * Explicitly treats null values: if ignoreNullKeys is true, rows with missing keys are ignored;
 * otherwise null matches null.
 */
export function findDuplicateRows(
  headers: string[],
  rows: Record<string, unknown>[],
  keyColumns?: string[],
  ignoreNullKeys = false,
): DuplicateDetectionResult {
  const activeKeys = keyColumns && keyColumns.length > 0 ? keyColumns : headers
  const groupsMap = new Map<string, number[]>()
  const duplicateRowIndices = new Set<number>()

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]
    let hasNullKey = false

    const compositeKey = activeKeys
      .map((k) => {
        const val = row[k]
        if (isNullValue(val)) {
          hasNullKey = true
          return '__NULL__'
        }
        return String(val).trim()
      })
      .join('|||')

    if (ignoreNullKeys && hasNullKey) {
      continue
    }

    const existing = groupsMap.get(compositeKey)
    if (existing) {
      existing.push(idx)
      duplicateRowIndices.add(idx)
      // also mark the first occurrence as part of duplicate group
      duplicateRowIndices.add(existing[0])
    } else {
      groupsMap.set(compositeKey, [idx])
    }
  }

  const multiGroups: Array<{ key: string; indices: number[] }> = []
  for (const [key, indices] of groupsMap.entries()) {
    if (indices.length > 1) {
      multiGroups.push({ key, indices })
    }
  }

  const duplicateCount = duplicateRowIndices.size
  const duplicatePercentage =
    rows.length > 0 ? Number(((duplicateCount / rows.length) * 100).toFixed(1)) : 0

  return {
    duplicateCount,
    duplicatePercentage,
    groups: multiGroups,
    duplicateRowIndices,
  }
}

/**
 * Removes duplicate rows according to user-selected strategy:
 * - 'keep_first': retains the first row in each duplicate group.
 * - 'keep_last': retains the last row in each duplicate group.
 * - 'remove_all': removes every row that belongs to a duplicate group (keeps only unique rows).
 */
export function removeDuplicateRows(
  headers: string[],
  rows: Record<string, unknown>[],
  keyColumns: string[],
  strategy: DuplicateStrategy,
  ignoreNullKeys = false,
): { rows: Record<string, unknown>[]; removedCount: number } {
  const { groups } = findDuplicateRows(headers, rows, keyColumns, ignoreNullKeys)
  const indicesToRemove = new Set<number>()

  for (const { indices } of groups) {
    if (strategy === 'keep_first') {
      // keep indices[0], remove the rest
      for (let i = 1; i < indices.length; i++) {
        indicesToRemove.add(indices[i])
      }
    } else if (strategy === 'keep_last') {
      // keep indices[indices.length - 1], remove prior
      for (let i = 0; i < indices.length - 1; i++) {
        indicesToRemove.add(indices[i])
      }
    } else if (strategy === 'remove_all') {
      // remove all occurrences in the group
      for (const idx of indices) {
        indicesToRemove.add(idx)
      }
    }
  }

  const filtered = rows.filter((_, idx) => !indicesToRemove.has(idx))
  return {
    rows: filtered,
    removedCount: indicesToRemove.size,
  }
}

/**
 * --------------------------------------------------------------------------
 * 2. MISSING-VALUE ANALYSIS & IMPUTATION
 * --------------------------------------------------------------------------
 */

export function imputeMissing(
  rows: Record<string, unknown>[],
  column: string,
  strategy: ImputationStrategy,
  columnType: ColumnType,
  constantValue?: string | number,
): { rows: Record<string, unknown>[]; imputedCount: number } {
  // Prevent invalid mathematical imputation on categorical data
  if ((strategy === 'mean' || strategy === 'median') && columnType !== 'number') {
    throw new Error(
      `Cannot apply mathematical imputation (${strategy}) to non-numeric column '${column}'. Use mode, constant, or fill instead.`,
    )
  }

  let fillValue: string | number | boolean | null = null

  if (strategy === 'mean' || strategy === 'median') {
    const validNums = rows
      .map((r) => r[column])
      .filter((v) => !isNullValue(v))
      .map((v) => Number(String(v).replace(/,/g, '')))
      .filter((n) => !isNaN(n) && isFinite(n))

    if (validNums.length === 0) {
      throw new Error(`Column '${column}' contains no valid numeric values to compute ${strategy}.`)
    }

    if (strategy === 'mean') {
      const sum = validNums.reduce((a, b) => a + b, 0)
      fillValue = Number((sum / validNums.length).toFixed(4))
    } else {
      const sorted = [...validNums].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      fillValue =
        sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    }
  } else if (strategy === 'mode') {
    const frequency = new Map<string, number>()
    for (const r of rows) {
      const val = r[column]
      if (!isNullValue(val)) {
        const s = String(val).trim()
        frequency.set(s, (frequency.get(s) ?? 0) + 1)
      }
    }

    let topVal = ''
    let maxCount = -1
    for (const [val, count] of frequency.entries()) {
      if (count > maxCount) {
        maxCount = count
        topVal = val
      }
    }

    if (maxCount === -1) {
      throw new Error(`Column '${column}' has no valid values to compute mode.`)
    }

    fillValue = columnType === 'number' && !isNaN(Number(topVal)) ? Number(topVal) : topVal
  } else if (strategy === 'constant') {
    if (constantValue === undefined || constantValue === null || constantValue === '') {
      throw new Error('A constant value must be provided for constant imputation.')
    }
    fillValue = constantValue
  }

  let imputedCount = 0
  const updatedRows = rows.map((r) => ({ ...r }))

  if (strategy === 'ffill') {
    let lastKnown: unknown = null
    for (let i = 0; i < updatedRows.length; i++) {
      const val = updatedRows[i][column]
      if (isNullValue(val)) {
        if (lastKnown !== null) {
          updatedRows[i][column] = lastKnown
          imputedCount++
        }
      } else {
        lastKnown = val
      }
    }
  } else if (strategy === 'bfill') {
    let nextKnown: unknown = null
    for (let i = updatedRows.length - 1; i >= 0; i--) {
      const val = updatedRows[i][column]
      if (isNullValue(val)) {
        if (nextKnown !== null) {
          updatedRows[i][column] = nextKnown
          imputedCount++
        }
      } else {
        nextKnown = val
      }
    }
  } else {
    for (let i = 0; i < updatedRows.length; i++) {
      if (isNullValue(updatedRows[i][column])) {
        updatedRows[i][column] = fillValue
        imputedCount++
      }
    }
  }

  return { rows: updatedRows, imputedCount }
}

export function dropMissingRows(
  rows: Record<string, unknown>[],
  column?: string,
  mode: 'any' | 'all' = 'any',
  headers?: string[],
): { rows: Record<string, unknown>[]; droppedCount: number } {
  let kept: Record<string, unknown>[]

  if (column) {
    kept = rows.filter((r) => !isNullValue(r[column]))
  } else {
    const activeHeaders = headers || (rows.length > 0 ? Object.keys(rows[0]) : [])
    kept = rows.filter((r) => {
      const nulls = activeHeaders.filter((h) => isNullValue(r[h])).length
      if (mode === 'any') {
        return nulls === 0
      } else {
        return nulls < activeHeaders.length
      }
    })
  }

  return {
    rows: kept,
    droppedCount: rows.length - kept.length,
  }
}

export function dropColumn(
  headers: string[],
  rows: Record<string, unknown>[],
  columnToDrop: string,
): { headers: string[]; rows: Record<string, unknown>[] } {
  const newHeaders = headers.filter((h) => h !== columnToDrop)
  const newRows = rows.map((r) => {
    const copy = { ...r }
    delete copy[columnToDrop]
    return copy
  })
  return { headers: newHeaders, rows: newRows }
}

/**
 * --------------------------------------------------------------------------
 * 3. OUTLIER ANALYSIS (IQR & Z-SCORE)
 * --------------------------------------------------------------------------
 */

export interface OutlierDetectionResult {
  outlierIndices: Set<number>
  lowerBound: number
  upperBound: number
  count: number
  method: OutlierMethod
  threshold: number
}

export function detectOutliers(
  rows: Record<string, unknown>[],
  column: string,
  method: OutlierMethod = 'iqr',
  threshold = 1.5,
): OutlierDetectionResult {
  const numberEntries: Array<{ idx: number; val: number }> = []

  for (let i = 0; i < rows.length; i++) {
    const v = rows[i][column]
    if (!isNullValue(v)) {
      const num = Number(String(v).replace(/,/g, ''))
      if (!isNaN(num) && isFinite(num)) {
        numberEntries.push({ idx: i, val: num })
      }
    }
  }

  if (numberEntries.length < 4) {
    return {
      outlierIndices: new Set(),
      lowerBound: 0,
      upperBound: 0,
      count: 0,
      method,
      threshold,
    }
  }

  let lowerBound = 0
  let upperBound = 0
  const outlierIndices = new Set<number>()

  if (method === 'iqr') {
    const sorted = [...numberEntries].sort((a, b) => a.val - b.val)
    const n = sorted.length
    const q1Idx = Math.floor(n * 0.25)
    const q3Idx = Math.floor(n * 0.75)
    const q1 = sorted[q1Idx].val
    const q3 = sorted[q3Idx].val
    const iqr = q3 - q1

    lowerBound = Number((q1 - threshold * iqr).toFixed(4))
    upperBound = Number((q3 + threshold * iqr).toFixed(4))

    for (const { idx, val } of numberEntries) {
      if (val < lowerBound || val > upperBound) {
        outlierIndices.add(idx)
      }
    }
  } else {
    // Z-Score
    const sum = numberEntries.reduce((acc, e) => acc + e.val, 0)
    const mean = sum / numberEntries.length
    const variance =
      numberEntries.reduce((acc, e) => acc + Math.pow(e.val - mean, 2), 0) /
      (numberEntries.length - 1)
    const stdDev = Math.sqrt(variance)

    if (stdDev === 0) {
      return {
        outlierIndices: new Set(),
        lowerBound: mean,
        upperBound: mean,
        count: 0,
        method,
        threshold,
      }
    }

    lowerBound = Number((mean - threshold * stdDev).toFixed(4))
    upperBound = Number((mean + threshold * stdDev).toFixed(4))

    for (const { idx, val } of numberEntries) {
      const z = Math.abs(val - mean) / stdDev
      if (z > threshold) {
        outlierIndices.add(idx)
      }
    }
  }

  return {
    outlierIndices,
    lowerBound,
    upperBound,
    count: outlierIndices.size,
    method,
    threshold,
  }
}

export function treatOutliers(
  rows: Record<string, unknown>[],
  column: string,
  method: OutlierMethod,
  treatment: OutlierTreatment,
  threshold = 1.5,
): { rows: Record<string, unknown>[]; affectedCount: number } {
  const { outlierIndices, lowerBound, upperBound } = detectOutliers(
    rows,
    column,
    method,
    threshold,
  )

  if (outlierIndices.size === 0) {
    return { rows, affectedCount: 0 }
  }

  if (treatment === 'remove') {
    const filtered = rows.filter((_, idx) => !outlierIndices.has(idx))
    return {
      rows: filtered,
      affectedCount: outlierIndices.size,
    }
  } else {
    // 'cap' (Winsorization)
    const updated = rows.map((r, idx) => {
      if (!outlierIndices.has(idx)) return { ...r }
      const val = Number(String(r[column]).replace(/,/g, ''))
      const capped = val < lowerBound ? lowerBound : upperBound
      return {
        ...r,
        [column]: capped,
      }
    })
    return {
      rows: updated,
      affectedCount: outlierIndices.size,
    }
  }
}

/**
 * --------------------------------------------------------------------------
 * 4. TEXT & CATEGORICAL CLEANING
 * --------------------------------------------------------------------------
 */

export function trimWhitespace(
  rows: Record<string, unknown>[],
  column?: string,
): { rows: Record<string, unknown>[]; affectedCount: number } {
  let affectedCount = 0
  const updated = rows.map((r) => {
    const copy = { ...r }
    const keys = column ? [column] : Object.keys(copy)
    for (const k of keys) {
      const v = copy[k]
      if (typeof v === 'string') {
        const trimmed = v.trim()
        if (trimmed !== v) {
          copy[k] = trimmed
          affectedCount++
        }
      }
    }
    return copy
  })
  return { rows: updated, affectedCount }
}

export function normalizeCapitalization(
  rows: Record<string, unknown>[],
  column: string,
  normalization: CaseNormalization,
): { rows: Record<string, unknown>[]; affectedCount: number } {
  let affectedCount = 0
  const updated = rows.map((r) => {
    const copy = { ...r }
    const v = copy[column]
    if (typeof v === 'string' && !isNullValue(v)) {
      let formatted = v
      if (normalization === 'lower') {
        formatted = v.toLowerCase()
      } else if (normalization === 'upper') {
        formatted = v.toUpperCase()
      } else if (normalization === 'title') {
        formatted = v
          .toLowerCase()
          .replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase())
      }

      if (formatted !== v) {
        copy[column] = formatted
        affectedCount++
      }
    }
    return copy
  })
  return { rows: updated, affectedCount }
}

export function replaceCategoryValues(
  rows: Record<string, unknown>[],
  column: string,
  fromValue: string,
  toValue: string,
): { rows: Record<string, unknown>[]; affectedCount: number } {
  let affectedCount = 0
  const updated = rows.map((r) => {
    const copy = { ...r }
    const v = copy[column]
    if (v !== undefined && v !== null && String(v).trim() === fromValue.trim()) {
      copy[column] = toValue
      affectedCount++
    }
    return copy
  })
  return { rows: updated, affectedCount }
}

export function detectInconsistentCategories(
  rows: Record<string, unknown>[],
  column: string,
): InconsistentCategoryGroup[] {
  const groups = new Map<string, Map<string, number>>()

  for (const r of rows) {
    const v = r[column]
    if (!isNullValue(v)) {
      const raw = String(v).trim()
      const normalized = raw.toLowerCase()

      if (!groups.has(normalized)) {
        groups.set(normalized, new Map())
      }
      const rawMap = groups.get(normalized)!
      rawMap.set(raw, (rawMap.get(raw) ?? 0) + 1)
    }
  }

  const results: InconsistentCategoryGroup[] = []
  for (const [normalized, rawMap] of groups.entries()) {
    if (rawMap.size > 1) {
      const counts: Record<string, number> = {}
      for (const [raw, cnt] of rawMap.entries()) {
        counts[raw] = cnt
      }
      results.push({
        normalized,
        variants: Array.from(rawMap.keys()),
        counts,
      })
    }
  }

  return results
}

/**
 * --------------------------------------------------------------------------
 * 5. DATA TYPE CONVERSION & VALIDATION
 * --------------------------------------------------------------------------
 */

export function convertColumnType(
  rows: Record<string, unknown>[],
  column: string,
  targetType: ColumnType,
  fallback: 'null' | 'original' = 'null',
): { rows: Record<string, unknown>[]; convertedCount: number; failedCount: number } {
  let convertedCount = 0
  let failedCount = 0

  const updated = rows.map((r) => {
    const copy = { ...r }
    const v = copy[column]
    if (isNullValue(v)) return copy

    const str = String(v).trim()

    if (targetType === 'number') {
      const clean = str.replace(/,/g, '')
      const num = Number(clean)
      if (!isNaN(num) && isFinite(num) && clean !== '') {
        copy[column] = num
        convertedCount++
      } else {
        failedCount++
        copy[column] = fallback === 'null' ? null : v
      }
    } else if (targetType === 'boolean') {
      const lower = str.toLowerCase()
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        copy[column] = true
        convertedCount++
      } else if (lower === 'false' || lower === '0' || lower === 'no') {
        copy[column] = false
        convertedCount++
      } else {
        failedCount++
        copy[column] = fallback === 'null' ? null : v
      }
    } else if (targetType === 'date') {
      const timestamp = Date.parse(str)
      if (!isNaN(timestamp)) {
        copy[column] = new Date(timestamp).toISOString().split('T')[0]
        convertedCount++
      } else {
        failedCount++
        copy[column] = fallback === 'null' ? null : v
      }
    } else {
      // string
      copy[column] = str
      convertedCount++
    }

    return copy
  })

  return { rows: updated, convertedCount, failedCount }
}

export function validateRules(
  rows: Record<string, unknown>[],
  rules: ValidationRule[],
): { violations: RuleViolation[]; violationCount: number } {
  const violations: RuleViolation[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    for (const rule of rules) {
      const val = row[rule.column]
      const isNull = isNullValue(val)

      if (rule.ruleType === 'required') {
        if (isNull) {
          violations.push({
            rowIdx: i + 1,
            column: rule.column,
            value: null,
            reason: `Field '${rule.column}' is required but contains missing value.`,
          })
        }
      } else if (!isNull) {
        if (rule.ruleType === 'range') {
          const num = Number(String(val).replace(/,/g, ''))
          if (isNaN(num)) {
            violations.push({
              rowIdx: i + 1,
              column: rule.column,
              value: val,
              reason: `Value '${val}' is not a valid number for range check.`,
            })
          } else {
            if (rule.min !== undefined && num < rule.min) {
              violations.push({
                rowIdx: i + 1,
                column: rule.column,
                value: val,
                reason: `Value ${num} is below minimum allowed ${rule.min}.`,
              })
            }
            if (rule.max !== undefined && num > rule.max) {
              violations.push({
                rowIdx: i + 1,
                column: rule.column,
                value: val,
                reason: `Value ${num} is above maximum allowed ${rule.max}.`,
              })
            }
          }
        } else if (rule.ruleType === 'allowed_values' && rule.allowedValues) {
          const str = String(val).trim()
          if (!rule.allowedValues.includes(str)) {
            violations.push({
              rowIdx: i + 1,
              column: rule.column,
              value: val,
              reason: `Value '${str}' is not in allowed list [${rule.allowedValues.join(', ')}].`,
            })
          }
        } else if (rule.ruleType === 'regex' && rule.pattern) {
          const str = String(val)
          const reg = new RegExp(rule.pattern)
          if (!reg.test(str)) {
            violations.push({
              rowIdx: i + 1,
              column: rule.column,
              value: val,
              reason: `Value does not match required pattern /${rule.pattern}/.`,
            })
          }
        }
      }
    }
  }

  return {
    violations,
    violationCount: violations.length,
  }
}

/**
 * --------------------------------------------------------------------------
 * 6. EXPORT UTILITIES WITH CSV INJECTION DEFENSE (CWE-1236)
 * --------------------------------------------------------------------------
 */

const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r'])

/**
 * Escapes values vulnerable to formula injection before exporting CSV.
 */
export function sanitizeCSVValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.length > 0 && FORMULA_TRIGGERS.has(str.charAt(0))) {
    // Prepend single quote to neutralize spreadsheet formula execution
    return `'${str}`
  }
  return str
}

export function exportToSafeCSV(
  headers: string[],
  rows: Record<string, unknown>[],
): string {
  const sanitizedRows = rows.map((r) => {
    const clean: Record<string, string> = {}
    for (const h of headers) {
      clean[h] = sanitizeCSVValue(r[h])
    }
    return clean
  })

  return Papa.unparse(sanitizedRows, {
    columns: headers,
    quotes: false,
    quoteChar: '"',
    escapeChar: '"',
    delimiter: ',',
    header: true,
    newline: '\r\n',
  })
}
