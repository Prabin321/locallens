import { useState } from 'react'
import type { ImputationStrategy } from '../../types/cleaning'
import type { ColumnProfile } from '../../types/dataset'

interface MissingValuesPanelProps {
  columns: ColumnProfile[]
  onImpute: (column: string, strategy: ImputationStrategy, constantValue?: string | number) => void
  onDropRows: (column: string) => void
  onDropColumn: (column: string) => void
}

export function MissingValuesPanel({
  columns,
  onImpute,
  onDropRows,
  onDropColumn,
}: MissingValuesPanelProps) {
  // Filter columns that have missing values, or allow all
  const columnsWithNulls = columns.filter((c) => c.nullCount > 0)
  const [selectedColName, setSelectedColName] = useState<string>(
    columnsWithNulls.length > 0 ? columnsWithNulls[0].name : columns[0]?.name || '',
  )
  const [strategy, setStrategy] = useState<ImputationStrategy>('mode')
  const [constantVal, setConstantVal] = useState<string>('')

  const selectedCol = columns.find((c) => c.name === selectedColName)
  const isNumeric = selectedCol?.type === 'number'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
          Missing-Value Analysis & Imputation
        </h4>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
          Inspect missing-data distributions and safely impute values or remove sparse rows/columns.
        </p>
      </div>

      {/* Column Selector */}
      <div
        style={{
          padding: '1rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}>
          Select Column to Treat:
        </label>
        <select
          value={selectedColName}
          onChange={(e) => {
            const newColName = e.target.value
            setSelectedColName(newColName)
            const target = columns.find((c) => c.name === newColName)
            if (target?.type !== 'number' && (strategy === 'mean' || strategy === 'median')) {
              setStrategy('mode')
            }
          }}
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            fontSize: '0.88rem',
            outline: 'none',
          }}
        >
          {columns.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.type}) — {c.nullCount} missing ({c.nullPercentage}%)
            </option>
          ))}
        </select>

        {selectedCol && selectedCol.nullPercentage > 30 && (
          <div
            style={{
              marginTop: '0.85rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '0.8rem',
              color: '#fbbf24',
            }}
          >
            ⚠️ <strong>High Missingness Warning:</strong> Column '{selectedCol.name}' has {selectedCol.nullPercentage}% missing values. Mathematical imputation may severely distort feature variance and introduce estimation bias. Consider dropping sparse records or the entire column.
          </div>
        )}
      </div>

      {/* Imputation Strategy Selection */}
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.75rem' }}>
          Select Imputation Method:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {/* Mean */}
          <label
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: strategy === 'mean' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: strategy === 'mean' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              opacity: isNumeric ? 1 : 0.35,
              cursor: isNumeric ? 'pointer' : 'not-allowed',
            }}
          >
            <input
              type="radio"
              name="impute_strategy"
              value="mean"
              disabled={!isNumeric}
              checked={strategy === 'mean'}
              onChange={() => setStrategy('mean')}
            />
            <span style={{ marginLeft: '0.4rem', fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
              Mean (Numeric only)
            </span>
          </label>

          {/* Median */}
          <label
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: strategy === 'median' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: strategy === 'median' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              opacity: isNumeric ? 1 : 0.35,
              cursor: isNumeric ? 'pointer' : 'not-allowed',
            }}
          >
            <input
              type="radio"
              name="impute_strategy"
              value="median"
              disabled={!isNumeric}
              checked={strategy === 'median'}
              onChange={() => setStrategy('median')}
            />
            <span style={{ marginLeft: '0.4rem', fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
              Median (Robust to outliers)
            </span>
          </label>

          {/* Mode */}
          <label
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: strategy === 'mode' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: strategy === 'mode' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="impute_strategy"
              value="mode"
              checked={strategy === 'mode'}
              onChange={() => setStrategy('mode')}
            />
            <span style={{ marginLeft: '0.4rem', fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
              Mode (Most frequent)
            </span>
          </label>

          {/* Constant */}
          <label
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: strategy === 'constant' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: strategy === 'constant' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="impute_strategy"
              value="constant"
              checked={strategy === 'constant'}
              onChange={() => setStrategy('constant')}
            />
            <span style={{ marginLeft: '0.4rem', fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
              Constant Value
            </span>
          </label>

          {/* Forward Fill */}
          <label
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: strategy === 'ffill' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: strategy === 'ffill' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="impute_strategy"
              value="ffill"
              checked={strategy === 'ffill'}
              onChange={() => setStrategy('ffill')}
            />
            <span style={{ marginLeft: '0.4rem', fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
              Forward Fill (ffill)
            </span>
          </label>

          {/* Backward Fill */}
          <label
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: strategy === 'bfill' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: strategy === 'bfill' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="impute_strategy"
              value="bfill"
              checked={strategy === 'bfill'}
              onChange={() => setStrategy('bfill')}
            />
            <span style={{ marginLeft: '0.4rem', fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
              Backward Fill (bfill)
            </span>
          </label>
        </div>

        {strategy === 'constant' && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
              Custom Replacement Value:
            </label>
            <input
              type="text"
              placeholder={isNumeric ? 'e.g. 0 or -1' : 'e.g. Unknown or N/A'}
              value={constantVal}
              onChange={(e) => setConstantVal(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            disabled={!selectedCol || selectedCol.nullCount === 0}
            onClick={() => {
              if (selectedCol) {
                onImpute(selectedCol.name, strategy, constantVal)
              }
            }}
            style={{
              padding: '0.65rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              background:
                selectedCol && selectedCol.nullCount > 0
                  ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                  : '#334155',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: selectedCol && selectedCol.nullCount > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Apply Imputation ({selectedCol?.nullCount ?? 0} cells)
          </button>

          <button
            type="button"
            disabled={!selectedCol || selectedCol.nullCount === 0}
            onClick={() => {
              if (selectedCol) onDropRows(selectedCol.name)
            }}
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: selectedCol && selectedCol.nullCount > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Drop Rows with Missing Values ({selectedCol?.nullCount ?? 0})
          </button>

          <button
            type="button"
            disabled={!selectedCol}
            onClick={() => {
              if (selectedCol) onDropColumn(selectedCol.name)
            }}
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Drop Column Entirely
          </button>
        </div>
      </div>
    </div>
  )
}
