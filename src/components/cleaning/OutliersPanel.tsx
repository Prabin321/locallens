import { useState, useMemo } from 'react'
import type { OutlierMethod, OutlierTreatment } from '../../types/cleaning'
import type { ColumnProfile } from '../../types/dataset'
import { detectOutliers } from '../../lib/cleaner'

interface OutliersPanelProps {
  columns: ColumnProfile[]
  rows: Record<string, unknown>[]
  onApply: (column: string, method: OutlierMethod, treatment: OutlierTreatment, threshold: number) => void
}

export function OutliersPanel({ columns, rows, onApply }: OutliersPanelProps) {
  const numericColumns = columns.filter((c) => c.type === 'number')
  const [selectedColName, setSelectedColName] = useState<string>(
    numericColumns.length > 0 ? numericColumns[0].name : '',
  )
  const [method, setMethod] = useState<OutlierMethod>('iqr')
  const [treatment, setTreatment] = useState<OutlierTreatment>('cap')
  const [threshold, setThreshold] = useState<number>(1.5)

  const outlierResult = useMemo(() => {
    if (!selectedColName) return null
    return detectOutliers(rows, selectedColName, method, threshold)
  }, [rows, selectedColName, method, threshold])

  if (numericColumns.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
        No numerical columns detected in this dataset to analyze for statistical outliers.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
          Statistical Outlier Analysis & Treatment
        </h4>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
          Detect extreme deviations using Interquartile Range (IQR) or Z-Score metrics. Never delete extreme observations without domain verification.
        </p>
      </div>

      {/* Educational Notice */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderRadius: '10px',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          fontSize: '0.8rem',
          color: '#fef3c7',
          lineHeight: 1.5,
        }}
      >
        💡 <strong>Statistical Note:</strong> Outliers are not automatically errors! Extreme values often reflect genuine phenomena (e.g. high-net-worth customers, critical emergency alerts, or black-swan financial spikes). Winsorization (capping to bounds) is recommended over deletion because it retains statistical power without distorting linear models.
      </div>

      {/* Column & Method Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.4rem' }}>
            Numeric Column:
          </label>
          <select
            value={selectedColName}
            onChange={(e) => setSelectedColName(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          >
            {numericColumns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} (Min: {c.numericalStats?.min}, Max: {c.numericalStats?.max})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.4rem' }}>
            Detection Method:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setMethod('iqr')
                setThreshold(1.5)
              }}
              style={{
                flex: 1,
                padding: '0.45rem',
                borderRadius: '6px',
                border: method === 'iqr' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: method === 'iqr' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: method === 'iqr' ? '#ffffff' : '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              IQR (Tukey's Fences)
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod('zscore')
                setThreshold(3.0)
              }}
              style={{
                flex: 1,
                padding: '0.45rem',
                borderRadius: '6px',
                border: method === 'zscore' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: method === 'zscore' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: method === 'zscore' ? '#ffffff' : '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Z-Score (Standard Deviations)
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.4rem' }}>
            Threshold Multiplier ({threshold}x):
          </label>
          <input
            type="range"
            min={method === 'iqr' ? 1.0 : 2.0}
            max={method === 'iqr' ? 3.0 : 4.5}
            step={0.1}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
            <span>{method === 'iqr' ? '1.0 (Mild)' : '2.0 (Mild)'}</span>
            <span>{method === 'iqr' ? '3.0 (Extreme)' : '4.5 (Extreme)'}</span>
          </div>
        </div>
      </div>

      {/* Detection Results & Bounds */}
      {outlierResult && (
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
              Detected Outliers
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: outlierResult.count > 0 ? '#38bdf8' : '#10b981', marginTop: '0.2rem' }}>
              {outlierResult.count} values
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
              Acceptable Lower Bound
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
              {outlierResult.lowerBound}
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
              Acceptable Upper Bound
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
              {outlierResult.upperBound}
            </div>
          </div>
        </div>
      )}

      {/* Treatment Strategy */}
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.75rem' }}>
          Select Outlier Treatment:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <label
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: treatment === 'cap' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: treatment === 'cap' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <input
              type="radio"
              name="treatment"
              value="cap"
              checked={treatment === 'cap'}
              onChange={() => setTreatment('cap')}
            />
            <div>
              <strong style={{ display: 'block', fontSize: '0.82rem', color: '#f8fafc' }}>
                Cap Values (Winsorization)
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Clips values to the lower/upper thresholds while preserving every row.
              </span>
            </div>
          </label>

          <label
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: treatment === 'remove' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: treatment === 'remove' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <input
              type="radio"
              name="treatment"
              value="remove"
              checked={treatment === 'remove'}
              onChange={() => setTreatment('remove')}
            />
            <div>
              <strong style={{ display: 'block', fontSize: '0.82rem', color: '#ef4444' }}>
                Remove Rows with Outliers
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Drops rows whose values exceed statistical thresholds.
              </span>
            </div>
          </label>
        </div>

        <button
          type="button"
          disabled={!outlierResult || outlierResult.count === 0}
          onClick={() => {
            if (outlierResult && outlierResult.count > 0) {
              onApply(selectedColName, method, treatment, threshold)
            }
          }}
          style={{
            padding: '0.65rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background:
              outlierResult && outlierResult.count > 0
                ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                : '#334155',
            color: '#ffffff',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: outlierResult && outlierResult.count > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          Apply Outlier Treatment ({outlierResult?.count ?? 0} values)
        </button>
      </div>
    </div>
  )
}
