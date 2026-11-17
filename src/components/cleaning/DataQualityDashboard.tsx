import type { DataQualityReport } from '../../types/quality'

interface DataQualityDashboardProps {
  report: DataQualityReport
  onNavigateToTab?: (tab: string) => void
}

export function DataQualityDashboard({ report, onNavigateToTab }: DataQualityDashboardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981'
    if (score >= 75) return '#38bdf8'
    if (score >= 50) return '#f59e0b'
    return '#ef4444'
  }

  const overallColor = getScoreColor(report.overallScore)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Hero Score Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          padding: '1.75rem',
          borderRadius: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.025)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          alignItems: 'center',
        }}
      >
        {/* Overall score gauge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div
            style={{
              width: '105px',
              height: '105px',
              borderRadius: '50%',
              border: `6px solid ${overallColor}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 24px ${overallColor}33`,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
              {report.overallScore}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginTop: '3px' }}>
              Score / 100
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc' }}>
                Overall Data Quality
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  backgroundColor: `${overallColor}22`,
                  color: overallColor,
                  border: `1px solid ${overallColor}`,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {report.overallScore >= 85 ? 'High Quality' : report.overallScore >= 60 ? 'Moderate' : 'Needs Cleaning'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Deterministic assessment combining Completeness (35%), Uniqueness (25%), Validity (25%), and Consistency (15%).
            </p>
          </div>
        </div>

        {/* Quick summary counters */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            padding: '1rem',
            borderRadius: '12px',
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>
              Missing Cells
            </span>
            <strong style={{ fontSize: '1.15rem', color: report.nullCells > 0 ? '#f59e0b' : '#10b981' }}>
              {report.nullCells.toLocaleString()}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>
              Duplicate Rows
            </span>
            <strong style={{ fontSize: '1.15rem', color: report.duplicateRows > 0 ? '#f59e0b' : '#10b981' }}>
              {report.duplicateRows.toLocaleString()}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>
              Outlier Values
            </span>
            <strong style={{ fontSize: '1.15rem', color: report.outlierValues > 0 ? '#38bdf8' : '#10b981' }}>
              {report.outlierValues.toLocaleString()}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>
              Text Inconsistencies
            </span>
            <strong style={{ fontSize: '1.15rem', color: report.inconsistentCategoryCount > 0 ? '#c084fc' : '#10b981' }}>
              {report.inconsistentCategoryCount.toLocaleString()}
            </strong>
          </div>
        </div>
      </div>

      {/* 4 Dimension Breakdown Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
        }}
      >
        {Object.values(report.dimensions).map((dim) => {
          const dimColor = getScoreColor(dim.score)
          return (
            <div
              key={dim.name}
              style={{
                padding: '1.25rem',
                borderRadius: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.98rem', color: '#f8fafc' }}>
                    {dim.name}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Weight: {dim.weight * 100}%
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '1.65rem', fontWeight: 800, color: dimColor }}>
                    {dim.score}%
                  </span>
                </div>

                <div
                  style={{
                    height: '6px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: `${dim.score}%`,
                      height: '100%',
                      backgroundColor: dimColor,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  {dim.description}
                </p>
              </div>

              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#64748b',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                }}
              >
                Formula: {dim.formula}
              </div>
            </div>
          )
        })}
      </div>

      {/* Issues & Remediation List */}
      <div
        style={{
          borderRadius: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.025)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
              Identified Data Quality Issues ({report.issues.length})
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Actionable anomalies detected across the dataset
            </p>
          </div>
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('cleaning')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🧹 Open Cleaning Workspace
            </button>
          )}
        </div>

        {report.issues.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981', fontSize: '0.9rem' }}>
            🎉 Excellent data hygiene! No major quality issues detected.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {report.issues.map((issue) => {
              const badgeStyle =
                issue.severity === 'critical'
                  ? { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444' }
                  : issue.severity === 'warning'
                    ? { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: '#f59e0b' }
                    : { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#38bdf8' }

              return (
                <div
                  key={issue.id}
                  style={{
                    padding: '0.85rem 1.15rem',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.text,
                          border: `1px solid ${badgeStyle.border}`,
                        }}
                      >
                        {issue.severity}
                      </span>
                      <strong style={{ fontSize: '0.88rem', color: '#f1f5f9' }}>
                        {issue.description}
                      </strong>
                    </div>
                    {issue.column && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          color: '#e2e8f0',
                          fontFamily: 'monospace',
                        }}
                      >
                        {issue.column}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    💡 <strong>Recommendation:</strong> {issue.recommendation}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Heuristic Disclaimer */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            fontSize: '0.75rem',
            color: '#64748b',
            lineHeight: 1.4,
          }}
        >
          ℹ️ <strong>Methodology Note:</strong> This quality score is a deterministic, heuristic assessment computed locally inside your browser sandbox. Scores provide an objective guide rather than an absolute truth; domain-specific contexts (e.g. valid repeated transactions or legitimate high earners) must always be considered.
        </div>
      </div>
    </div>
  )
}
