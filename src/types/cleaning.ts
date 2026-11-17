export type DuplicateStrategy = 'keep_first' | 'keep_last' | 'remove_all'

export type ImputationStrategy =
  | 'mean'
  | 'median'
  | 'mode'
  | 'constant'
  | 'ffill'
  | 'bfill'

export type OutlierMethod = 'iqr' | 'zscore'

export type OutlierTreatment = 'cap' | 'remove'

export type CaseNormalization = 'lower' | 'upper' | 'title'

export type RuleType = 'range' | 'allowed_values' | 'required' | 'regex'

export interface ValidationRule {
  id: string
  column: string
  ruleType: RuleType
  min?: number
  max?: number
  allowedValues?: string[]
  pattern?: string
  description: string
}

export interface RuleViolation {
  rowIdx: number
  column: string
  value: unknown
  reason: string
}

export type CleaningActionType =
  | 'remove_duplicates'
  | 'impute_missing'
  | 'drop_missing_rows'
  | 'drop_missing_column'
  | 'treat_outliers'
  | 'convert_type'
  | 'trim_whitespace'
  | 'normalize_case'
  | 'replace_category'
  | 'drop_column'
  | 'custom_rule'

export interface CleaningAction {
  id: string
  timestamp: string
  type: CleaningActionType
  description: string
  affectedRows: number
  affectedColumns: string[]
  parameters: Record<string, unknown>
}

export interface InconsistentCategoryGroup {
  normalized: string
  variants: string[]
  counts: Record<string, number>
}

export interface DatasetSnapshot {
  headers: string[]
  rows: Record<string, string | number | boolean | null>[]
}
