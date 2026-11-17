import { useState, useMemo } from 'react'
import type {
  CaseNormalization,
  CleaningAction,
  DuplicateStrategy,
  ImputationStrategy,
  OutlierMethod,
  OutlierTreatment,
  ValidationRule,
} from '../../types/cleaning'
import type { ColumnProfile } from '../../types/dataset'
import type { DataQualityReport } from '../../types/quality'
import {
  dropColumn,
  dropMissingRows,
  findDuplicateRows,
  imputeMissing,
  normalizeCapitalization,
  removeDuplicateRows,
  replaceCategoryValues,
  treatOutliers,
  trimWhitespace,
} from '../../lib/cleaner'
import { DuplicatesPanel } from './DuplicatesPanel'
import { MissingValuesPanel } from './MissingValuesPanel'
import { OutliersPanel } from './OutliersPanel'
import { TextCleanPanel } from './TextCleanPanel'
import { ValidationPanel } from './ValidationPanel'

interface CleaningWorkspaceProps {
  originalRows: Record<string, unknown>[]
  currentHeaders: string[]
  currentRows: Record<string, unknown>[]
  columns: ColumnProfile[]
  currentQualityReport: DataQualityReport
  initialQualityReport: DataQualityReport
  cleaningHistory: CleaningAction[]
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  onCommitAction: (
    newHeaders: string[],
    newRows: Record<string, unknown>[],
    action: CleaningAction,
  ) => void
  rules: ValidationRule[]
  onAddRule: (rule: ValidationRule) => void
  onRemoveRule: (ruleId: string) => void
}

interface PendingActionModal {
  title: string
  description: string
  affectedRows: number
  affectedColumns: string[]
  execute: () => void
}

export function CleaningWorkspace({
  originalRows,
  currentHeaders,
  currentRows,
  columns,
  currentQualityReport,
  initialQualityReport,
  cleaningHistory,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onCommitAction,
  rules,
  onAddRule,
  onRemoveRule,
}: CleaningWorkspaceProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    'duplicates' | 'missing' | 'outliers' | 'text' | 'rules' | 'history'
  >('duplicates')
  const [pendingModal, setPendingModal] = useState<PendingActionModal | null>(null)

  // 1. Duplicates handler
  const handleApplyDuplicates = (
    strategy: DuplicateStrategy,
    keyColumns: string[],
    ignoreNullKeys: boolean,
  ) => {
    const { groups } = findDuplicateRows(currentHeaders, currentRows, keyColumns, ignoreNullKeys)
    let affectedRowsCount = 0
    for (const g of groups) {
      if (strategy === 'remove_all') affectedRowsCount += g.indices.length
      else affectedRowsCount += g.indices.length - 1
    }

    setPendingModal({
      title: 'Confirm Deduplication Transformation',
      description: `Resolve ${groups.length} duplicate groups using strategy '${strategy}' on keys [${keyColumns.join(', ')}].`,
      affectedRows: affectedRowsCount,
      affectedColumns: keyColumns,
      execute: () => {
        const { rows: newRows, removedCount } = removeDuplicateRows(
          currentHeaders,
          currentRows,
          keyColumns,
          strategy,
          ignoreNullKeys,
        )
        onCommitAction(currentHeaders, newRows, {
          id: `dup-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'remove_duplicates',
          description: `Removed ${removedCount} duplicate rows using strategy '${strategy}'.`,
          affectedRows: removedCount,
          affectedColumns: keyColumns,
          parameters: { strategy, keyColumns, ignoreNullKeys },
        })
      },
    })
  }

  // 2. Missing values handler
  const handleApplyImpute = (
    column: string,
    strategy: ImputationStrategy,
    constantValue?: string | number,
  ) => {
    const colProfile = columns.find((c) => c.name === column)
    if (!colProfile) return

    setPendingModal({
      title: 'Confirm Missing-Value Imputation',
      description: `Impute missing values in column '${column}' using ${strategy.toUpperCase()} strategy${
        strategy === 'constant' ? ` (value: "${constantValue}")` : ''
      }.`,
      affectedRows: colProfile.nullCount,
      affectedColumns: [column],
      execute: () => {
        const { rows: newRows, imputedCount } = imputeMissing(
          currentRows,
          column,
          strategy,
          colProfile.type,
          constantValue,
        )
        onCommitAction(currentHeaders, newRows, {
          id: `imp-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'impute_missing',
          description: `Imputed ${imputedCount} missing values in '${column}' using ${strategy}.`,
          affectedRows: imputedCount,
          affectedColumns: [column],
          parameters: { strategy, constantValue },
        })
      },
    })
  }

  const handleDropMissingRows = (column: string) => {
    const colProfile = columns.find((c) => c.name === column)
    const nullCount = colProfile?.nullCount || 0

    setPendingModal({
      title: 'Confirm Row Deletion for Missing Data',
      description: `Drop all records that have missing/null values in column '${column}'.`,
      affectedRows: nullCount,
      affectedColumns: [column],
      execute: () => {
        const { rows: newRows, droppedCount } = dropMissingRows(currentRows, column)
        onCommitAction(currentHeaders, newRows, {
          id: `drop-row-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'drop_missing_rows',
          description: `Dropped ${droppedCount} rows missing in '${column}'.`,
          affectedRows: droppedCount,
          affectedColumns: [column],
          parameters: { column },
        })
      },
    })
  }

  const handleDropColumn = (column: string) => {
    setPendingModal({
      title: 'Confirm Column Deletion',
      description: `Permanently remove column '${column}' from the dataset schema.`,
      affectedRows: currentRows.length,
      affectedColumns: [column],
      execute: () => {
        const { headers: newHeaders, rows: newRows } = dropColumn(
          currentHeaders,
          currentRows,
          column,
        )
        onCommitAction(newHeaders, newRows, {
          id: `drop-col-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'drop_column',
          description: `Dropped column '${column}' from schema.`,
          affectedRows: currentRows.length,
          affectedColumns: [column],
          parameters: { column },
        })
      },
    })
  }

  // 3. Outlier handler
  const handleApplyOutlier = (
    column: string,
    method: OutlierMethod,
    treatment: OutlierTreatment,
    threshold: number,
  ) => {
    setPendingModal({
      title: `Confirm Outlier ${treatment === 'cap' ? 'Winsorization / Capping' : 'Row Removal'}`,
      description: `Apply ${method.toUpperCase()} outlier treatment (${treatment}) to column '${column}' at ${threshold}x threshold.`,
      affectedRows: 0, // dynamic
      affectedColumns: [column],
      execute: () => {
        const { rows: newRows, affectedCount } = treatOutliers(
          currentRows,
          column,
          method,
          treatment,
          threshold,
        )
        onCommitAction(currentHeaders, newRows, {
          id: `outlier-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'treat_outliers',
          description: `${treatment === 'cap' ? 'Capped' : 'Removed'} ${affectedCount} outliers in '${column}' using ${method}.`,
          affectedRows: affectedCount,
          affectedColumns: [column],
          parameters: { method, treatment, threshold },
        })
      },
    })
  }

  // 4. Text clean handlers
  const handleTrim = (column?: string) => {
    setPendingModal({
      title: 'Confirm Whitespace Trimming',
      description: column
        ? `Trim leading and trailing whitespace in column '${column}'.`
        : 'Trim leading and trailing whitespace across all text columns in dataset.',
      affectedRows: currentRows.length,
      affectedColumns: column ? [column] : currentHeaders,
      execute: () => {
        const { rows: newRows, affectedCount } = trimWhitespace(currentRows, column)
        onCommitAction(currentHeaders, newRows, {
          id: `trim-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'trim_whitespace',
          description: `Trimmed whitespace across ${affectedCount} cells.`,
          affectedRows: affectedCount,
          affectedColumns: column ? [column] : currentHeaders,
          parameters: { column: column || 'all' },
        })
      },
    })
  }

  const handleNormalizeCase = (column: string, normalization: CaseNormalization) => {
    setPendingModal({
      title: 'Confirm Capitalization Normalization',
      description: `Normalize text in column '${column}' to ${normalization.toUpperCase()} case.`,
      affectedRows: currentRows.length,
      affectedColumns: [column],
      execute: () => {
        const { rows: newRows, affectedCount } = normalizeCapitalization(
          currentRows,
          column,
          normalization,
        )
        onCommitAction(currentHeaders, newRows, {
          id: `case-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'normalize_case',
          description: `Normalized ${affectedCount} entries in '${column}' to ${normalization} case.`,
          affectedRows: affectedCount,
          affectedColumns: [column],
          parameters: { column, normalization },
        })
      },
    })
  }

  const handleReplaceCategory = (column: string, fromVal: string, toVal: string) => {
    setPendingModal({
      title: 'Confirm Category Replacement',
      description: `Replace all instances of "${fromVal}" with "${toVal}" in column '${column}'.`,
      affectedRows: 0,
      affectedColumns: [column],
      execute: () => {
        const { rows: newRows, affectedCount } = replaceCategoryValues(
          currentRows,
          column,
          fromVal,
          toVal,
        )
        onCommitAction(currentHeaders, newRows, {
          id: `cat-replace-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'replace_category',
          description: `Replaced ${affectedCount} instances of "${fromVal}" with "${toVal}" in '${column}'.`,
          affectedRows: affectedCount,
          affectedColumns: [column],
          parameters: { column, fromVal, toVal },
        })
      },
    })
  }

  // Before & After Stats calculations
  const beforeAfterStats = useMemo(() => {
    const rowDelta = currentRows.length - originalRows.length
    const nullDelta = currentQualityReport.nullCells - initialQualityReport.nullCells
    const scoreDelta = Number(
      (currentQualityReport.overallScore - initialQualityReport.overallScore).toFixed(1),
    )

    return { rowDelta, nullDelta, scoreDelta }
  }, [originalRows, currentRows, currentQualityReport, initialQualityReport])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Workspace Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.35rem' }}>🧹</span>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              Interactive Cleaning Workspace
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {cleaningHistory.length} transformation steps applied • Full reproducible undo/redo stack
          </span>
        </div>

        {/* Undo / Redo / Reset buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo last action (Ctrl+Z)"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: canUndo ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: canUndo ? '#f8fafc' : '#64748b',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: canUndo ? 'pointer' : 'not-allowed',
            }}
          >
            ↩ Undo
          </button>

          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo next action (Ctrl+Y)"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: canRedo ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: canRedo ? '#f8fafc' : '#64748b',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: canRedo ? 'pointer' : 'not-allowed',
            }}
          >
            ↪ Redo
          </button>

          <button
            type="button"
            disabled={cleaningHistory.length === 0}
            onClick={onReset}
            title="Reset dataset back to raw uploaded version"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backgroundColor: cleaningHistory.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              color: cleaningHistory.length > 0 ? '#fca5a5' : '#64748b',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: cleaningHistory.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Reset to Original
          </button>
        </div>
      </div>

      {/* Before & After Quick Comparison Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          padding: '1.25rem',
          borderRadius: '14px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Rows (Original → Current)
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
            {originalRows.length.toLocaleString()} → {currentRows.length.toLocaleString()}{' '}
            <span
              style={{
                fontSize: '0.75rem',
                color: beforeAfterStats.rowDelta < 0 ? '#f59e0b' : '#94a3b8',
                fontWeight: 600,
              }}
            >
              ({beforeAfterStats.rowDelta >= 0 ? '+' : ''}
              {beforeAfterStats.rowDelta})
            </span>
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Missing Cells
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
            {initialQualityReport.nullCells.toLocaleString()} →{' '}
            {currentQualityReport.nullCells.toLocaleString()}{' '}
            <span
              style={{
                fontSize: '0.75rem',
                color: beforeAfterStats.nullDelta < 0 ? '#10b981' : '#94a3b8',
                fontWeight: 600,
              }}
            >
              ({beforeAfterStats.nullDelta <= 0 ? '' : '+'}
              {beforeAfterStats.nullDelta})
            </span>
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Data Quality Score
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
            {initialQualityReport.overallScore} → {currentQualityReport.overallScore}{' '}
            <span
              style={{
                fontSize: '0.75rem',
                color:
                  beforeAfterStats.scoreDelta > 0
                    ? '#10b981'
                    : beforeAfterStats.scoreDelta < 0
                      ? '#ef4444'
                      : '#94a3b8',
                fontWeight: 700,
              }}
            >
              ({beforeAfterStats.scoreDelta >= 0 ? '+' : ''}
              {beforeAfterStats.scoreDelta})
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '0.75rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('duplicates')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: activeSubTab === 'duplicates' ? '1px solid #38bdf8' : '1px solid transparent',
            backgroundColor:
              activeSubTab === 'duplicates' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeSubTab === 'duplicates' ? '#38bdf8' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          1. Duplicates
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('missing')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: activeSubTab === 'missing' ? '1px solid #38bdf8' : '1px solid transparent',
            backgroundColor:
              activeSubTab === 'missing' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeSubTab === 'missing' ? '#38bdf8' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          2. Missing Values
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('outliers')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: activeSubTab === 'outliers' ? '1px solid #38bdf8' : '1px solid transparent',
            backgroundColor:
              activeSubTab === 'outliers' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeSubTab === 'outliers' ? '#38bdf8' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          3. Outliers (IQR / Z-Score)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('text')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: activeSubTab === 'text' ? '1px solid #38bdf8' : '1px solid transparent',
            backgroundColor:
              activeSubTab === 'text' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeSubTab === 'text' ? '#38bdf8' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          4. Text & Categories
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('rules')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: activeSubTab === 'rules' ? '1px solid #38bdf8' : '1px solid transparent',
            backgroundColor:
              activeSubTab === 'rules' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeSubTab === 'rules' ? '#38bdf8' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          5. Validation Rules
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: activeSubTab === 'history' ? '1px solid #38bdf8' : '1px solid transparent',
            backgroundColor:
              activeSubTab === 'history' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeSubTab === 'history' ? '#38bdf8' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          6. Audit Trail ({cleaningHistory.length})
        </button>
      </div>

      {/* Sub-Panel Contents */}
      <div
        style={{
          padding: '1.5rem',
          borderRadius: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.025)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {activeSubTab === 'duplicates' && (
          <DuplicatesPanel
            headers={currentHeaders}
            rows={currentRows}
            onApply={handleApplyDuplicates}
          />
        )}

        {activeSubTab === 'missing' && (
          <MissingValuesPanel
            columns={columns}
            onImpute={handleApplyImpute}
            onDropRows={handleDropMissingRows}
            onDropColumn={handleDropColumn}
          />
        )}

        {activeSubTab === 'outliers' && (
          <OutliersPanel
            columns={columns}
            rows={currentRows}
            onApply={handleApplyOutlier}
          />
        )}

        {activeSubTab === 'text' && (
          <TextCleanPanel
            columns={columns}
            rows={currentRows}
            onTrim={handleTrim}
            onNormalizeCase={handleNormalizeCase}
            onReplaceCategory={handleReplaceCategory}
          />
        )}

        {activeSubTab === 'rules' && (
          <ValidationPanel
            columns={columns}
            rows={currentRows}
            rules={rules}
            onAddRule={onAddRule}
            onRemoveRule={onRemoveRule}
          />
        )}

        {activeSubTab === 'history' && (
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              Reproducible Cleaning Audit Log
            </h4>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.84rem', color: '#94a3b8' }}>
              Step-by-step history of all user-approved transformations applied to this dataset.
            </p>

            {cleaningHistory.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No transformations have been applied yet. Select a cleaning tool above to begin.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {cleaningHistory.map((action, idx) => (
                  <div
                    key={action.id}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>
                          #{idx + 1}
                        </span>
                        <strong style={{ fontSize: '0.85rem', color: '#f1f5f9' }}>
                          {action.description}
                        </strong>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {new Date(action.timestamp).toLocaleTimeString()} • Affected columns: [
                        {action.affectedColumns.join(', ')}]
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        color: '#38bdf8',
                        fontWeight: 600,
                      }}
                    >
                      {action.affectedRows} rows modified
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {pendingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              borderRadius: '16px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              {pendingModal.title}
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              {pendingModal.description}
            </p>

            <div
              style={{
                padding: '0.85rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '1.5rem',
                fontSize: '0.82rem',
                color: '#94a3b8',
                lineHeight: 1.5,
              }}
            >
              <div>
                <strong>Affected Columns:</strong> [{pendingModal.affectedColumns.join(', ')}]
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <strong>Impact:</strong> Reversible transformation via the Undo stack. Original raw dataset remains preserved.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPendingModal(null)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: 'transparent',
                  color: '#e2e8f0',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  pendingModal.execute()
                  setPendingModal(null)
                }}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
