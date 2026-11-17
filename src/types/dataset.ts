export type ColumnType = 'number' | 'string' | 'boolean' | 'date'

export interface HistogramBin {
  binStart: number
  binEnd: number
  count: number
  percentage: number
}

export interface NumericalStats {
  min: number
  max: number
  mean: number
  median: number
  stdDev: number
  histogram: HistogramBin[]
}

export interface CategoryFrequency {
  value: string
  count: number
  percentage: number
}

export interface CategoricalStats {
  uniqueCount: number
  topCategories: CategoryFrequency[]
}

export interface BooleanStats {
  trueCount: number
  falseCount: number
}

export interface DateStats {
  minDate: string
  maxDate: string
}

export interface ColumnProfile {
  name: string
  type: ColumnType
  totalCount: number
  validCount: number
  nullCount: number
  nullPercentage: number
  uniqueCount: number
  numericalStats?: NumericalStats
  categoricalStats?: CategoricalStats
  booleanStats?: BooleanStats
  dateStats?: DateStats
}

export interface DatasetProfile {
  fileName: string
  fileSizeBytes: number
  rowCount: number
  columnCount: number
  columns: ColumnProfile[]
  previewRows: Record<string, string | number | boolean | null>[]
  rawHeaders: string[]
  parseDurationMs: number
  totalCells: number
  totalNullCells: number
  overallMissingRate: number
}

export interface SampleDatasetOption {
  id: string
  name: string
  description: string
  csvContent: string
}
