import { describe, it, expect } from 'vitest'
import {
  findDuplicateRows,
  removeDuplicateRows,
  imputeMissing,
  trimWhitespace,
} from './cleaner'
import { parseAndProfileCSV } from './profiler'

describe('Workflow: Undo, Redo, Reset and Original Data Preservation', () => {
  const initialHeaders = ['id', 'name', 'salary']
  const originalRows = [
    { id: 1, name: ' Alice ', salary: 100000 },
    { id: 2, name: 'Bob', salary: null },
    { id: 1, name: ' Alice ', salary: 100000 }, // duplicate
  ]

  it('preserves the original dataset untouched across cleaning pipeline', () => {
    // Deep clone to simulate initial state
    const originalCopy = JSON.parse(JSON.stringify(originalRows))

    // Step 1: Remove duplicates
    const step1 = removeDuplicateRows(initialHeaders, originalRows, initialHeaders, 'keep_first')
    expect(step1.removedCount).toBe(1)
    expect(step1.rows.length).toBe(2)

    // Step 2: Impute missing
    const step2 = imputeMissing(step1.rows, 'salary', 'constant', 'number', 75000)
    expect(step2.imputedCount).toBe(1)

    // Step 3: Trim whitespace
    const step3 = trimWhitespace(step2.rows, 'name')
    expect(step3.affectedCount).toBe(1)
    expect(step3.rows[0].name).toBe('Alice')

    // Verify original dataset is completely unmodified
    expect(originalRows).toEqual(originalCopy)
    expect(originalRows.length).toBe(3)
    expect(originalRows[0].name).toBe(' Alice ')
    expect(originalRows[1].salary).toBeNull()
  })

  it('simulates undo, redo, and reset stack faithfully', () => {
    // Snapshot stack
    const history: Array<{ headers: string[]; rows: Record<string, unknown>[] }> = []
    let currentIdx = 0

    // Initial snapshot
    history.push({ headers: initialHeaders, rows: JSON.parse(JSON.stringify(originalRows)) })

    // Action 1: Remove duplicates
    const a1 = removeDuplicateRows(initialHeaders, history[currentIdx].rows, initialHeaders, 'keep_first')
    history.push({ headers: initialHeaders, rows: a1.rows })
    currentIdx++
    expect(history[currentIdx].rows.length).toBe(2)

    // Action 2: Impute
    const a2 = imputeMissing(history[currentIdx].rows, 'salary', 'constant', 'number', 50000)
    history.push({ headers: initialHeaders, rows: a2.rows })
    currentIdx++
    expect(history[currentIdx].rows[1].salary).toBe(50000)

    // Undo action 2
    currentIdx--
    expect(history[currentIdx].rows[1].salary).toBeNull()

    // Redo action 2
    currentIdx++
    expect(history[currentIdx].rows[1].salary).toBe(50000)

    // Reset to index 0
    currentIdx = 0
    expect(history[currentIdx].rows.length).toBe(3)
    expect(history[currentIdx].rows[1].salary).toBeNull()
  })

  it('recalculates data quality score dynamically after transformations', () => {
    // Initial evaluation
    const initialDups = findDuplicateRows(initialHeaders, originalRows)
    expect(initialDups.duplicateCount).toBe(2)

    // Transform
    const cleaned = removeDuplicateRows(initialHeaders, originalRows, initialHeaders, 'keep_first')
    const finalDups = findDuplicateRows(initialHeaders, cleaned.rows)
    expect(finalDups.duplicateCount).toBe(0)
  })
})

describe('Malformed CSV & Unexpected Field Handling', () => {
  it('handles jagged / inconsistent row lengths gracefully with skipEmptyLines', async () => {
    const jaggedCSV = `colA,colB,colC
val1,val2,val3
val4,val5
val7,val8,val9,valExtra`

    const profile = await parseAndProfileCSV(jaggedCSV, 'jagged.csv', 100)
    expect(profile.rowCount).toBe(3)
    expect(profile.columnCount).toBe(3)
    // valExtra in row 3 is handled, row 2 colC is null
    const colC = profile.columns.find((c) => c.name === 'colC')!
    expect(colC.nullCount).toBe(1)
  })

  it('rejects completely invalid CSV content without headers', async () => {
    await expect(parseAndProfileCSV('\n\n\n', 'empty.csv', 0)).rejects.toThrow()
  })
})
