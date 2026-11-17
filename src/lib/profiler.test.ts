import { describe, it, expect } from 'vitest'
import {
  isNullValue,
  isNumberString,
  isBooleanString,
  isDateString,
  inferColumnType,
  computeNumericalStats,
  computeCategoricalStats,
  profileColumn,
  parseAndProfileCSV,
} from './profiler'

describe('profiler utility functions', () => {
  it('correctly identifies null and missing values', () => {
    expect(isNullValue(null)).toBe(true)
    expect(isNullValue(undefined)).toBe(true)
    expect(isNullValue('')).toBe(true)
    expect(isNullValue('   ')).toBe(true)
    expect(isNullValue('NA')).toBe(true)
    expect(isNullValue('N/A')).toBe(true)
    expect(isNullValue('null')).toBe(true)
    expect(isNullValue('None')).toBe(true)
    expect(isNullValue('NaN')).toBe(true)
    expect(isNullValue('-')).toBe(true)
    expect(isNullValue('?')).toBe(true)
    expect(isNullValue('#N/A')).toBe(true)

    expect(isNullValue('0')).toBe(false)
    expect(isNullValue('false')).toBe(false)
    expect(isNullValue('valid text')).toBe(false)
  })

  it('detects number, boolean, and date strings accurately', () => {
    expect(isNumberString('42')).toBe(true)
    expect(isNumberString('-3.1415')).toBe(true)
    expect(isNumberString('1,500.50')).toBe(true)
    expect(isNumberString('1e6')).toBe(true)
    expect(isNumberString('abc')).toBe(false)

    expect(isBooleanString('true')).toBe(true)
    expect(isBooleanString('FALSE')).toBe(true)
    expect(isBooleanString('yes')).toBe(false)

    expect(isDateString('2026-03-15')).toBe(true)
    expect(isDateString('12/31/2025')).toBe(true)
    expect(isDateString('2024')).toBe(false) // pure 4-digit number should not be parsed as date
    expect(isDateString('hello')).toBe(false)
  })

  it('infers correct dominant column types', () => {
    expect(inferColumnType(['10', '20.5', '30', '40', 'NA'])).toBe('number')
    expect(inferColumnType(['true', 'false', 'true', 'null'])).toBe('boolean')
    expect(inferColumnType(['2026-01-01', '2026-01-02', '2026-01-03', ''])).toBe('date')
    expect(inferColumnType(['Cat', 'Dog', 'Bird', 'Fish', '42'])).toBe('string')
    expect(inferColumnType(['', 'null', 'nan'])).toBe('string') // all null defaults to string
  })
})

describe('computeNumericalStats', () => {
  it('computes exact mean, median, min, max, and stdDev', () => {
    // Array: [2, 4, 4, 4, 5, 5, 7, 9] -> count 8, sum 40, mean 5.0
    const nums = [2, 4, 4, 4, 5, 5, 7, 9]
    const stats = computeNumericalStats(nums, 4)

    expect(stats.min).toBe(2)
    expect(stats.max).toBe(9)
    expect(stats.mean).toBe(5)
    expect(stats.median).toBe(4.5) // (4 + 5) / 2
    expect(stats.stdDev).toBeCloseTo(2.138, 2)
    expect(stats.histogram.length).toBeGreaterThan(0)
  })

  it('handles odd-length arrays for median', () => {
    const nums = [1, 3, 5]
    const stats = computeNumericalStats(nums)
    expect(stats.median).toBe(3)
  })

  it('handles single value array without division by zero', () => {
    const stats = computeNumericalStats([100])
    expect(stats.min).toBe(100)
    expect(stats.max).toBe(100)
    expect(stats.mean).toBe(100)
    expect(stats.median).toBe(100)
    expect(stats.stdDev).toBe(0)
    expect(stats.histogram[0].percentage).toBe(100)
  })

  it('handles empty numbers array gracefully', () => {
    const stats = computeNumericalStats([])
    expect(stats.mean).toBe(0)
    expect(stats.stdDev).toBe(0)
    expect(stats.histogram).toEqual([])
  })
})

describe('computeCategoricalStats', () => {
  it('computes category frequencies and percentages', () => {
    const categories = ['Red', 'Blue', 'Red', 'Green', 'Red', 'Blue']
    const stats = computeCategoricalStats(categories)

    expect(stats.uniqueCount).toBe(3)
    expect(stats.topCategories[0]).toEqual({ value: 'Red', count: 3, percentage: 50.0 })
    expect(stats.topCategories[1]).toEqual({ value: 'Blue', count: 2, percentage: 33.3 })
    expect(stats.topCategories[2]).toEqual({ value: 'Green', count: 1, percentage: 16.7 })
  })

  it('handles empty category list', () => {
    const stats = computeCategoricalStats([])
    expect(stats.uniqueCount).toBe(0)
    expect(stats.topCategories).toEqual([])
  })
})

describe('profileColumn', () => {
  it('profiles a column with missing values and returns full profile', () => {
    const rawValues = ['10', '20', '', 'null', '30']
    const col = profileColumn('age', rawValues)

    expect(col.name).toBe('age')
    expect(col.type).toBe('number')
    expect(col.totalCount).toBe(5)
    expect(col.validCount).toBe(3)
    expect(col.nullCount).toBe(2)
    expect(col.nullPercentage).toBe(40)
    expect(col.numericalStats?.mean).toBe(20)
  })

  it('profiles boolean column with true and false counts', () => {
    const rawValues = ['true', 'false', 'true', 'true', 'null']
    const col = profileColumn('verified', rawValues)

    expect(col.type).toBe('boolean')
    expect(col.booleanStats?.trueCount).toBe(3)
    expect(col.booleanStats?.falseCount).toBe(1)
    expect(col.nullCount).toBe(1)
  })

  it('profiles date column with date range', () => {
    const rawValues = ['2026-01-01', '2026-06-15', '2026-12-31']
    const col = profileColumn('event_date', rawValues)

    expect(col.type).toBe('date')
    expect(col.dateStats?.minDate).toBe('2026-01-01')
    expect(col.dateStats?.maxDate).toBe('2026-12-31')
  })
})

describe('parseAndProfileCSV', () => {
  it('parses raw CSV text into a complete DatasetProfile', async () => {
    const csv = `id,name,salary,department,active
1,Alice,85000,Engineering,true
2,Bob,92000,Engineering,true
3,Charlie,,Marketing,false
4,David,71000,Sales,true
5,Eve,110000,Engineering,true`

    const profile = await parseAndProfileCSV(csv, 'employees.csv', 150)

    expect(profile.fileName).toBe('employees.csv')
    expect(profile.rowCount).toBe(5)
    expect(profile.columnCount).toBe(5)
    expect(profile.columns.map((c) => c.name)).toEqual([
      'id',
      'name',
      'salary',
      'department',
      'active',
    ])

    const salaryCol = profile.columns.find((c) => c.name === 'salary')!
    expect(salaryCol.type).toBe('number')
    expect(salaryCol.nullCount).toBe(1)
    expect(salaryCol.validCount).toBe(4)
    expect(salaryCol.numericalStats?.min).toBe(71000)
    expect(salaryCol.numericalStats?.max).toBe(110000)

    const deptCol = profile.columns.find((c) => c.name === 'department')!
    expect(deptCol.type).toBe('string')
    expect(deptCol.categoricalStats?.topCategories[0].value).toBe('Engineering')
    expect(deptCol.categoricalStats?.topCategories[0].count).toBe(3)

    expect(profile.previewRows.length).toBe(5)
    expect(profile.totalCells).toBe(25)
    expect(profile.totalNullCells).toBe(1)
    expect(profile.overallMissingRate).toBe(4.0)
  })

  it('handles CSV with escaped commas in quotes properly', async () => {
    const csv = `product,description,price
P100,"Monitor, 27 inch 4K",399.99
P200,"Keyboard, Mechanical RGB",129.50`

    const profile = await parseAndProfileCSV(csv, 'products.csv', 100)
    expect(profile.rowCount).toBe(2)
    expect(profile.columnCount).toBe(3)
    expect(profile.previewRows[0].description).toBe('Monitor, 27 inch 4K')
  })

  it('rejects empty CSV with descriptive error', async () => {
    await expect(parseAndProfileCSV('', 'empty.csv', 0)).rejects.toThrow()
  })
})
