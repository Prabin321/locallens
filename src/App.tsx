import { useState } from 'react'
import { Navbar } from './components/Navbar'
import { FileUpload } from './components/FileUpload'
import { DatasetOverview } from './components/DatasetOverview'
import { ColumnProfileList } from './components/ColumnProfileList'
import { DataPreviewTable } from './components/DataPreviewTable'
import type { DatasetProfile } from './types/dataset'
import './App.css'

export function App() {
  const [datasetProfile, setDatasetProfile] = useState<DatasetProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {!datasetProfile ? (
          <div>
            {/* Hero Header */}
            <div style={{ textAlign: 'center', maxWidth: '780px', margin: '1rem auto 2.5rem auto' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  fontSize: '0.78rem',
                  color: '#38bdf8',
                  fontWeight: 600,
                  marginBottom: '1.25rem',
                }}
              >
                <span>⚡ On-Device Deterministic Data Profiling</span>
              </div>

              <h1
                style={{
                  fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  letterSpacing: '-0.03em',
                  margin: '0 0 1rem 0',
                  color: '#f8fafc',
                }}
              >
                Analyze Tabular Data with{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Zero Data Egress
                </span>
              </h1>

              <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                LocalLens processes your CSV files entirely inside your browser. Inspect missing
                values, type inference, numerical distributions, and categorical frequencies without
                uploading raw rows to any server.
              </p>
            </div>

            {/* File Upload / Sample Selector */}
            <FileUpload
              onProfileLoaded={setDatasetProfile}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />

            {/* Hybrid Architecture Diagram Cards */}
            <div style={{ marginTop: '3.5rem' }}>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.82rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  marginBottom: '1.25rem',
                }}
              >
                #BuildHybridAI Architecture Pipeline
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(56, 189, 248, 0.05)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>1️⃣</span>
                    <strong style={{ color: '#38bdf8' }}>Deterministic Profiling</strong>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Instantaneous in-browser statistics, type casting, schema extraction, and null detection.
                    Always active, 100% private.
                  </p>
                </div>

                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(129, 140, 248, 0.05)',
                    border: '1px solid rgba(129, 140, 248, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>2️⃣</span>
                    <strong style={{ color: '#818cf8' }}>On-Device AI (Nano)</strong>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Local Gemini Nano synthesizes micro-insights and clean data narratives directly within
                    the client machine for offline privacy.
                  </p>
                </div>

                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(168, 85, 247, 0.05)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>3️⃣</span>
                    <strong style={{ color: '#c084fc' }}>Cloud AI (Gemini 2.5)</strong>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Firebase AI Logic escalates macro synthesis, cross-table correlations, and predictive
                    modeling when complex reasoning is required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Summary Metrics */}
            <DatasetOverview
              profile={datasetProfile}
              onReset={() => setDatasetProfile(null)}
            />

            {/* Column Profiles */}
            <ColumnProfileList columns={datasetProfile.columns} />

            {/* Interactive Data Preview */}
            <DataPreviewTable
              headers={datasetProfile.rawHeaders}
              columns={datasetProfile.columns}
              rows={datasetProfile.previewRows}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.5rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#64748b',
          marginTop: 'auto',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          LocalLens • Built for the <strong>#BuildHybridAI 2026 Devpost Hackathon</strong> • React 19 +
          Vite + TypeScript + Firebase AI Ready •{' '}
          <a
            href="https://github.com/Prabin321/locallens"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#94a3b8', textDecoration: 'underline' }}
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}

export default App
