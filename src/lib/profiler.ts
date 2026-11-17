import Papa from 'papaparse'
import type {
  ColumnProfile,
  ColumnType,
  DatasetProfile,
  HistogramBin,
  NumericalStats,
  CategoricalStats,
  CategoryFrequency,
} from '../types/dataset'

/**
 * Standard missing/null value identifiers across CSV datasets.
 */
const NULL_LITERALS = new Set([
  '',
  'null',
  'none',
  'nan',
  'na',
  'n/a',
  'nil',
  '-',
  '--',
  '?',
  'undefined',
  '#n/a',
  '#null!',
])

export function isNullValue(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'string') {
    return NULL_LITERALS.has(val.trim().toLowerCase())
  }
  return false
}

export function isBooleanString(str: string): boolean {
  const lower = str.trim().toLowerCase()
  return lower === 'true' || lower === 'false'
}

export function isDateString(str: string): boolean {
  const trimmed = str.trim()
  // Ensure it looks like a date (not just a 4-digit number or time)
  if (/^\d{4}$/.test(trimmed)) return false
  if (!/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(trimmed)) {
    return false
  }
  const timestamp = Date.parse(trimmed)
  return !isNaN(timestamp)
}

export function isNumberString(str: string): boolean {
  const trimmed = str.trim().replace(/,/g, '') // handle thousands separator like "1,000"
  if (trimmed === '') return false
  const num = Number(trimmed)
  return !isNaN(num) && isFinite(num)
}

/**
 * Infers the dominant data type of an array of string values.
 */
export function inferColumnType(values: string[]): ColumnType {
  const validValues = values.filter((v) => !isNullValue(v))
  if (validValues.length === 0) return 'string'

  let numberCount = 0
  let booleanCount = 0
  let dateCount = 0

  for (const val of validValues) {
    if (isNumberString(val)) {
      numberCount++
    } else if (isBooleanString(val)) {
      booleanCount++
    } else if (isDateString(val)) {
      dateCount++
    }
  }

  const threshold = 0.8
  const count = validValues.length

  if (numberCount / count >= threshold) return 'number'
  if (booleanCount / count >= threshold) return 'boolean'
  if (dateCount / count >= threshold) return 'date'
  return 'string'
}

/**
 * Computes descriptive statistics for a numerical column.
 */
export function computeNumericalStats(numbers: number[], binCount = 8): NumericalStats {
  if (numbers.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      histogram: [],
    }
  }

  const sorted = [...numbers].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const sum = sorted.reduce((acc, n) => acc + n, 0)
  const mean = sum / sorted.length

  // Median
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]

  // Standard deviation (sample std dev)
  let stdDev = 0
  if (sorted.length > 1) {
    const variance =
      sorted.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / (sorted.length - 1)
    stdDev = Math.sqrt(variance)
  }

  // Histogram calculation
  const histogram: HistogramBin[] = []
  if (min === max) {
    histogram.push({
      binStart: min,
      binEnd: max,
      count: sorted.length,
      percentage: 100,
    })
  } else {
    const effectiveBinCount = Math.max(3, Math.min(binCount, 12))
    const step = (max - min) / effectiveBinCount
    const bins: number[] = new Array(effectiveBinCount).fill(0)

    for (const num of sorted) {
      let idx = Math.floor((num - min) / step)
      if (idx >= effectiveBinCount) idx = effectiveBinCount - 1
      bins[idx]++
    }

    for (let i = 0; i < effectiveBinCount; i++) {
      const bStart = min + i * step
      const bEnd = min + (i + 1) * step
      const count = bins[i]
      histogram.push({
        binStart: Number(bStart.toFixed(2)),
        binEnd: Number(bEnd.toFixed(2)),
        count,
        percentage: Number(((count / sorted.length) * 100).toFixed(1)),
      })
    }
  }

  return {
    min: Number(min.toFixed(4)),
    max: Number(max.toFixed(4)),
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    stdDev: Number(stdDev.toFixed(4)),
    histogram,
  }
}

/**
 * Computes categorical frequencies and top categories.
 */
export function computeCategoricalStats(
  values: string[],
  topN = 6,
): CategoricalStats {
  const counts = new Map<string, number>()

  for (const v of values) {
    const trimmed = v.trim()
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1)
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  const total = values.length

  const topCategories: CategoryFrequency[] = sorted.slice(0, topN).map(([val, cnt]) => ({
    value: val || '(empty)',
    count: cnt,
    percentage: total > 0 ? Number(((cnt / total) * 100).toFixed(1)) : 0,
  }))

  return {
    uniqueCount: counts.size,
    topCategories,
  }
}

/**
 * Profiles a single column from an array of raw string values.
 */
export function profileColumn(name: string, rawValues: string[]): ColumnProfile {
  const totalCount = rawValues.length
  let nullCount = 0
  const validValues: string[] = []

  for (const val of rawValues) {
    if (isNullValue(val)) {
      nullCount++
    } else {
      validValues.push(val)
    }
  }

  const validCount = validValues.length
  const nullPercentage =
    totalCount > 0 ? Number(((nullCount / totalCount) * 100).toFixed(1)) : 0
  const uniqueCount = new Set(validValues).size
  const type = inferColumnType(rawValues)

  const profile: ColumnProfile = {
    name,
    type,
    totalCount,
    validCount,
    nullCount,
    nullPercentage,
    uniqueCount,
  }

  if (type === 'number') {
    const numbers = validValues
      .map((v) => Number(v.trim().replace(/,/g, '')))
      .filter((n) => !isNaN(n) && isFinite(n))
    profile.numericalStats = computeNumericalStats(numbers)
  } else if (type === 'boolean') {
    let trueCount = 0
    let falseCount = 0
    for (const v of validValues) {
      if (v.trim().toLowerCase() === 'true') trueCount++
      else falseCount++
    }
    profile.booleanStats = { trueCount, falseCount }
    profile.categoricalStats = computeCategoricalStats(validValues)
  } else if (type === 'date') {
    const timestamps = validValues
      .map((v) => Date.parse(v))
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b)

    if (timestamps.length > 0) {
      profile.dateStats = {
        minDate: new Date(timestamps[0]).toISOString().split('T')[0],
        maxDate: new Date(timestamps[timestamps.length - 1]).toISOString().split('T')[0],
      }
    }
    profile.categoricalStats = computeCategoricalStats(validValues)
  } else {
    profile.categoricalStats = computeCategoricalStats(validValues)
  }

  return profile
}

/**
 * Parses CSV raw text in-browser and computes a complete deterministic DatasetProfile.
 */
export function parseAndProfileCSV(
  csvText: string,
  fileName: string,
  fileSizeBytes: number,
): Promise<DatasetProfile> {
  const startTime = performance.now()

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        try {
          const rawRows = results.data
          const headers = results.meta.fields ?? (rawRows.length > 0 ? Object.keys(rawRows[0]) : [])

          if (headers.length === 0 || rawRows.length === 0) {
            return reject(new Error('CSV file contains no valid rows or header columns.'))
          }

          const rowCount = rawRows.length
          const columnCount = headers.length
          const totalCells = rowCount * columnCount

          // Extract column slices
          const columns: ColumnProfile[] = headers.map((header) => {
            const columnValues = rawRows.map((row) => (row[header] !== undefined ? String(row[header]) : ''))
            return profileColumn(header, columnValues)
          })

          const totalNullCells = columns.reduce((acc, col) => acc + col.nullCount, 0)
          const overallMissingRate =
            totalCells > 0 ? Number(((totalNullCells / totalCells) * 100).toFixed(1)) : 0

          // Generate sample preview rows (first 100 rows)
          const previewRows = rawRows.slice(0, 100).map((row) => {
            const cleanRow: Record<string, string | number | boolean | null> = {}
            for (const h of headers) {
              const raw = row[h]
              if (isNullValue(raw)) {
                cleanRow[h] = null
              } else {
                cleanRow[h] = raw
              }
            }
            return cleanRow
          })

          const parseDurationMs = Number((performance.now() - startTime).toFixed(1))

          resolve({
            fileName,
            fileSizeBytes,
            rowCount,
            columnCount,
            columns,
            previewRows,
            rawHeaders: headers,
            parseDurationMs,
            totalCells,
            totalNullCells,
            overallMissingRate,
          })
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      },
      error: (error: Error) => {
        reject(error)
      },
    })
  })
}
