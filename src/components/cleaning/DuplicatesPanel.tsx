import { useState, useMemo } from 'react'
import type { DuplicateStrategy } from '../../types/cleaning'
import { findDuplicateRows } from '../../lib/cleaner'

interface DuplicatesPanelProps {
  headers: string[]
  rows: Record<string, unknown>[]
  onApply: (strategy: DuplicateStrategy, keyColumns: string[], ignoreNullKeys: boolean) => void
}

export function DuplicatesPanel({ headers, rows, onApply }: DuplicatesPanelProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(headers)
  const [strategy, setStrategy] = useState<DuplicateStrategy>('keep_first')
  const [ignoreNullKeys, setIgnoreNullKeys] = useState(false)

  // Real-time duplicate calculation
  const detection = useMemo(() => {
    return findDuplicateRows(headers, rows, selectedKeys, ignoreNullKeys)
  }, [headers, rows, selectedKeys, ignoreNullKeys])

  const toggleKey = (header: string) => {
    if (selectedKeys.includes(header)) {
      if (selectedKeys.length > 1) {
        setSelectedKeys(selectedKeys.filter((k) => k !== header))
      }
    } else {
      setSelectedKeys([...selectedKeys, header])
    }
  }

  const selectAll = () => setSelectedKeys(headers)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
          Duplicate Record Detection & Resolution
        </h4>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
          Identify and safely resolve exact or key-based duplicate records. LocalLens never deletes duplicates automatically.
        </p>
      </div>

      {/* Educational Notice */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderRadius: '10px',
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          fontSize: '0.8rem',
          color: '#bae6fd',
          lineHeight: 1.5,
        }}
      >
        💡 <strong>Analyst Note:</strong> Repeated values do not always represent duplicate records. For instance, customer purchase transactions or common names can legitimately repeat. Select composite keys (such as <code>transaction_id</code> or <code>customer_id + order_date</code>) to distinguish true duplicates from natural recurrence.
      </div>

      {/* Key Column Selection */}
      <div
        style={{
          padding: '1rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
            Identify Duplicates Based On:
          </span>
          <button
            type="button"
            onClick={selectAll}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.78rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Select All Columns
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {headers.map((h) => {
            const isSelected = selectedKeys.includes(h)
            return (
              <button
                key={h}
                type="button"
                onClick={() => toggleKey(h)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected ? '✓ ' : ''}{h}
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            id="ignoreNullKeys"
            checked={ignoreNullKeys}
            onChange={(e) => setIgnoreNullKeys(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="ignoreNullKeys" style={{ fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer' }}>
            Ignore records containing missing values in the key columns
          </label>
        </div>
      </div>

      {/* Detection Results */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Duplicate Records Found
          </span>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: detection.duplicateCount > 0 ? '#f59e0b' : '#10b981', marginTop: '0.2rem' }}>
            {detection.duplicateCount} ({detection.duplicatePercentage}%)
          </div>
        </div>

        <div
          style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Duplicate Groups
          </span>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
            {detection.groups.length}
          </div>
        </div>
      </div>

      {/* Strategy Selector & Execution */}
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.75rem' }}>
          Deduplication Strategy:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <label
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: strategy === 'keep_first' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: strategy === 'keep_first' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <input
              type="radio"
              name="strategy"
              value="keep_first"
              checked={strategy === 'keep_first'}
              onChange={() => setStrategy('keep_first')}
            />
            <div>
              <strong style={{ display: 'block', fontSize: '0.82rem', color: '#f8fafc' }}>Keep First Occurrence</strong>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Retains the first row encountered in each group.</span>
            </div>
          </label>

          <label
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: strategy === 'keep_last' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: strategy === 'keep_last' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <input
              type="radio"
              name="strategy"
              value="keep_last"
              checked={strategy === 'keep_last'}
              onChange={() => setStrategy('keep_last')}
            />
            <div>
              <strong style={{ display: 'block', fontSize: '0.82rem', color: '#f8fafc' }}>Keep Last Occurrence</strong>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Retains the most recent row in each duplicate group.</span>
            </div>
          </label>

          <label
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: strategy === 'remove_all' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: strategy === 'remove_all' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <input
              type="radio"
              name="strategy"
              value="remove_all"
              checked={strategy === 'remove_all'}
              onChange={() => setStrategy('remove_all')}
            />
            <div>
              <strong style={{ display: 'block', fontSize: '0.82rem', color: '#ef4444' }}>Remove All Duplicates</strong>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Drops every row that has duplicates (keeps only strictly unique rows).</span>
            </div>
          </label>
        </div>

        <button
          type="button"
          disabled={detection.duplicateCount === 0}
          onClick={() => onApply(strategy, selectedKeys, ignoreNullKeys)}
          style={{
            padding: '0.65rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: detection.duplicateCount > 0 ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' : '#334155',
            color: '#ffffff',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: detection.duplicateCount > 0 ? 'pointer' : 'not-allowed',
            boxShadow: detection.duplicateCount > 0 ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
          }}
        >
          Resolve Duplicates ({detection.groups.length} groups)
        </button>
      </div>
    </div>
  )
}
