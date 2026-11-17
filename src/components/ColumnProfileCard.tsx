import { DistributionChart } from './DistributionChart'
import type { ColumnProfile } from '../types/dataset'

interface ColumnProfileCardProps {
  column: ColumnProfile
}

export function ColumnProfileCard({ column }: ColumnProfileCardProps) {
  const getTypeBadge = () => {
    switch (column.type) {
      case 'number':
        return { label: 'Numerical', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' }
      case 'string':
        return { label: 'Categorical', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: '#c084fc' }
      case 'boolean':
        return { label: 'Boolean', color: '#facc15', bg: 'rgba(250, 204, 21, 0.15)', border: '#facc15' }
      case 'date':
        return { label: 'Date', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: '#34d399' }
    }
  }

  const badge = getTypeBadge()

  return (
    <div
      style={{
        borderRadius: '14px',
        backgroundColor: 'rgba(255, 255, 255, 0.025)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
    >
      {/* Top Header */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <span
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#f8fafc',
              wordBreak: 'break-word',
            }}
          >
            {column.name}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              color: badge.color,
              backgroundColor: badge.bg,
              border: `1px solid ${badge.border}`,
            }}
          >
            {badge.label}
          </span>
        </div>

        {/* Data Completeness & Missing Values Bar */}
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#94a3b8',
              marginBottom: '0.3rem',
            }}
          >
            <span>
              {column.validCount.toLocaleString()} / {column.totalCount.toLocaleString()} valid
            </span>
            <span>
              {column.nullCount > 0 ? (
                <strong style={{ color: '#f59e0b' }}>
                  {column.nullCount} missing ({column.nullPercentage}%)
                </strong>
              ) : (
                <span style={{ color: '#10b981' }}>100% complete</span>
              )}
            </span>
          </div>
          <div
            style={{
              height: '6px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div
              style={{
                width: `${100 - column.nullPercentage}%`,
                backgroundColor: badge.color,
              }}
            />
            {column.nullPercentage > 0 && (
              <div
                style={{
                  width: `${column.nullPercentage}%`,
                  backgroundColor: '#f59e0b',
                }}
              />
            )}
          </div>
        </div>

        {/* Numerical Summary */}
        {column.type === 'number' && column.numericalStats && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>MIN</span>
                <strong style={{ color: '#e2e8f0' }}>{column.numericalStats.min}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>MEAN</span>
                <strong style={{ color: '#e2e8f0' }}>{column.numericalStats.mean}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>MAX</span>
                <strong style={{ color: '#e2e8f0' }}>{column.numericalStats.max}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>MEDIAN</span>
                <strong style={{ color: '#e2e8f0' }}>{column.numericalStats.median}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>STD DEV</span>
                <strong style={{ color: '#e2e8f0' }}>{column.numericalStats.stdDev}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>DISTINCT</span>
                <strong style={{ color: '#e2e8f0' }}>{column.uniqueCount}</strong>
              </div>
            </div>

            {/* Distribution Histogram */}
            <DistributionChart
              bins={column.numericalStats.histogram}
              color={badge.color}
              height={100}
            />
          </div>
        )}

        {/* Categorical & Boolean Summary */}
        {(column.type === 'string' || column.type === 'boolean' || column.type === 'date') &&
          column.categoricalStats && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginBottom: '0.5rem',
                }}
              >
                <span>Top Categories ({column.uniqueCount} distinct)</span>
                {column.dateStats && (
                  <span style={{ color: '#34d399' }}>
                    {column.dateStats.minDate} → {column.dateStats.maxDate}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {column.categoricalStats.topCategories.map((cat, idx) => (
                  <div key={idx} style={{ fontSize: '0.78rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: '#e2e8f0',
                        marginBottom: '0.15rem',
                      }}
                    >
                      <span
                        style={{
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={cat.value}
                      >
                        {cat.value}
                      </span>
                      <span style={{ color: '#94a3b8' }}>
                        {cat.count} ({cat.percentage}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: '4px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${cat.percentage}%`,
                          height: '100%',
                          backgroundColor: badge.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
