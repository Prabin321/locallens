import type { DatasetProfile } from '../types/dataset'

interface DatasetOverviewProps {
  profile: DatasetProfile
  onReset: () => void
}

export function DatasetOverview({ profile, onReset }: DatasetOverviewProps) {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const typeCounts = profile.columns.reduce(
    (acc, col) => {
      acc[col.type] = (acc[col.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const missingRateColor =
    profile.overallMissingRate === 0
      ? '#10b981'
      : profile.overallMissingRate < 5
        ? '#38bdf8'
        : profile.overallMissingRate < 20
          ? '#f59e0b'
          : '#ef4444'

  return (
    <div
      style={{
        width: '100%',
        margin: '0 auto 1.5rem auto',
        padding: '1.5rem',
        borderRadius: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📄</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc' }}>
                {profile.fileName}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Size: {formatBytes(profile.fileSizeBytes)} • Processed on-device in{' '}
                <strong style={{ color: '#38bdf8' }}>{profile.parseDurationMs} ms</strong>
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#e2e8f0',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')
          }
        >
          📂 Load Another CSV
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            padding: '1rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Total Rows
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>
            {profile.rowCount.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            padding: '1rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Total Columns
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>
            {profile.columnCount}
          </div>
        </div>

        <div
          style={{
            padding: '1rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Total Data Cells
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>
            {profile.totalCells.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            padding: '1rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
            Missing Values
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: missingRateColor, marginTop: '0.2rem' }}>
            {profile.overallMissingRate}%
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.4rem', fontWeight: 400 }}>
              ({profile.totalNullCells.toLocaleString()} cells)
            </span>
          </div>
        </div>
      </div>

      {/* Schema / Types distribution breakdown */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.82rem',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
        }}
      >
        <span style={{ color: '#94a3b8', fontWeight: 600 }}>Schema Breakdown:</span>
        {typeCounts.number && (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            # Numerical: {typeCounts.number}
          </span>
        )}
        {typeCounts.string && (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            Aa Categorical: {typeCounts.string}
          </span>
        )}
        {typeCounts.boolean && (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: '#facc15',
              border: '1px solid rgba(234, 179, 8, 0.3)',
            }}
          >
            ✓/✕ Boolean: {typeCounts.boolean}
          </span>
        )}
        {typeCounts.date && (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(52, 211, 153, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(52, 211, 153, 0.3)',
            }}
          >
            📅 Date: {typeCounts.date}
          </span>
        )}
      </div>
    </div>
  )
}
