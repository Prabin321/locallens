import { useState } from 'react'
import type { CleaningAction } from '../../types/cleaning'
import type { DataQualityReport } from '../../types/quality'
import { exportToSafeCSV } from '../../lib/cleaner'
import { generateQualityReportMarkdown } from '../../lib/quality'

interface ExportPanelProps {
  headers: string[]
  rows: Record<string, unknown>[]
  qualityReport: DataQualityReport
  cleaningHistory: CleaningAction[]
  datasetName: string
}

export function ExportPanel({
  headers,
  rows,
  qualityReport,
  cleaningHistory,
  datasetName,
}: ExportPanelProps) {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null)

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setDownloadNotice(`Downloaded: ${filename}`)
    setTimeout(() => setDownloadNotice(null), 4000)
  }

  const baseName = datasetName.replace(/\.csv$/i, '')
  const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  const handleExportCSV = () => {
    const csv = exportToSafeCSV(headers, rows)
    downloadFile(csv, `locallens_cleaned_${baseName}_${getTimestamp()}.csv`, 'text/csv;charset=utf-8;')
  }

  const handleExportMarkdown = () => {
    const md = generateQualityReportMarkdown(qualityReport)
    downloadFile(
      md,
      `locallens_quality_report_${baseName}_${getTimestamp()}.md`,
      'text/markdown;charset=utf-8;',
    )
  }

  const handleExportJSON = () => {
    const payload = {
      report: qualityReport,
      cleaningAudit: cleaningHistory,
      exportedAt: new Date().toISOString(),
    }
    const json = JSON.stringify(payload, null, 2)
    downloadFile(
      json,
      `locallens_quality_report_${baseName}_${getTimestamp()}.json`,
      'application/json;charset=utf-8;',
    )
  }

  const handleExportAuditLog = () => {
    const log = JSON.stringify(cleaningHistory, null, 2)
    downloadFile(
      log,
      `locallens_audit_trail_${baseName}_${getTimestamp()}.json`,
      'application/json;charset=utf-8;',
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
          Dataset Export & Quality Audit Reports
        </h4>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
          Download your cleaned dataset and structured quality assessments. Formula injection protection (CWE-1236) is applied automatically.
        </p>
      </div>

      {downloadNotice && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#6ee7b7',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          ✅ {downloadNotice}
        </div>
      )}

      {/* Export Options Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Cleaned CSV Card */}
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📊</span>
              <div>
                <h5 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                  Cleaned Dataset (CSV)
                </h5>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                  {rows.length.toLocaleString()} rows • {headers.length} columns
                </span>
              </div>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Standard CSV file containing all approved transformations. Formula triggers (<code>=</code>, <code>+</code>, <code>-</code>, <code>@</code>) are safely escaped to prevent CSV injection vulnerabilities.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              padding: '0.65rem 1.25rem',
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
            Download Cleaned CSV
          </button>
        </div>

        {/* Markdown Quality Report Card */}
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📄</span>
              <div>
                <h5 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                  Quality Assessment (Markdown)
                </h5>
                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>
                  Score: {qualityReport.overallScore}/100 • {qualityReport.issues.length} issues
                </span>
              </div>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Human-readable technical summary with dimension scoring tables, transparent formulas, detected anomalies, and data hygiene recommendations.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportMarkdown}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#f8fafc',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Download Markdown Report (.md)
          </button>
        </div>

        {/* JSON AI Payload Card */}
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🤖</span>
              <div>
                <h5 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f3e8ff' }}>
                  Firebase AI Logic Payload (JSON)
                </h5>
                <span style={{ fontSize: '0.75rem', color: '#c084fc' }}>
                  Checkpoint 3 Ready Schema
                </span>
              </div>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Structured JSON object containing dimension metrics, column schemas, and anomaly vectors formatted for future Prompt API (Gemini Nano) and Cloud Gemini inference.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportJSON}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #c084fc',
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              color: '#f3e8ff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Download JSON Report (.json)
          </button>
        </div>

        {/* Reproducible Cleaning History Card */}
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📜</span>
              <div>
                <h5 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                  Reproducible Audit Trail
                </h5>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {cleaningHistory.length} transformation steps
                </span>
              </div>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Complete step-by-step audit record of all transformations, timestamps, and row modifications. Enables data provenance and pipeline reproducibility.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportAuditLog}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#f8fafc',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Download Audit Trail (.json)
          </button>
        </div>
      </div>
    </div>
  )
}
