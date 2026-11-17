import { useState, useMemo, useEffect, useCallback } from 'react'
import { Navbar } from './components/Navbar'
import { FileUpload } from './components/FileUpload'
import { DatasetOverview } from './components/DatasetOverview'
import { ColumnProfileList } from './components/ColumnProfileList'
import { DataPreviewTable } from './components/DataPreviewTable'
import { DataQualityDashboard } from './components/cleaning/DataQualityDashboard'
import { CleaningWorkspace } from './components/cleaning/CleaningWorkspace'
import { ExportPanel } from './components/cleaning/ExportPanel'
import type { DatasetProfile, ColumnProfile } from './types/dataset'
import type { CleaningAction, ValidationRule, DatasetSnapshot } from './types/cleaning'
import type { DataQualityReport } from './types/quality'
import { profileColumn } from './lib/profiler'
import { assessDataQuality } from './lib/quality'
import './App.css'
import { AIInsights } from './components/ai/AIInsights'

export function App() {
  const [datasetProfile, setDatasetProfile] = useState<DatasetProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'quality' | 'columns' | 'cleaning' | 'preview' | 'export' | 'ai'
  >('overview')

  // Cleaning Snapshot Stack (Undo / Redo / Reset)
  const [snapshots, setSnapshots] = useState<DatasetSnapshot[]>([])
  const [snapshotIndex, setSnapshotIndex] = useState(0)
  const [cleaningActions, setCleaningActions] = useState<CleaningAction[]>([])
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([])

  // Preview view toggle (Original vs Cleaned)
  const [previewMode, setPreviewMode] = useState<'cleaned' | 'original'>('cleaned')

  // When a new dataset is uploaded, initialize the snapshot history
  const handleProfileLoaded = (profile: DatasetProfile) => {
    setDatasetProfile(profile)
    const initialSnapshot: DatasetSnapshot = {
      headers: [...profile.rawHeaders],
      rows: profile.previewRows.map((r) => ({ ...r })),
    }
    setSnapshots([initialSnapshot])
    setSnapshotIndex(0)
    setCleaningActions([])
    setValidationRules([])
    setActiveTab('overview')
  }

  const currentSnapshot = useMemo(() => {
    if (snapshots[snapshotIndex]) return snapshots[snapshotIndex]
    return {
      headers: datasetProfile?.rawHeaders || [],
      rows: datasetProfile?.previewRows || [],
    }
  }, [snapshots, snapshotIndex, datasetProfile])

  // Recalculate column profiles for current snapshot
  const currentColumns: ColumnProfile[] = useMemo(() => {
    if (!currentSnapshot || currentSnapshot.rows.length === 0) {
      return datasetProfile?.columns || []
    }
    return currentSnapshot.headers.map((header) => {
      const colValues = currentSnapshot.rows.map((r) =>
        r[header] !== undefined && r[header] !== null ? String(r[header]) : '',
      )
      return profileColumn(header, colValues)
    })
  }, [currentSnapshot, datasetProfile])

  // Initial & Current Data Quality Reports
  const initialQualityReport: DataQualityReport = useMemo(() => {
    if (!datasetProfile) {
      return {
        datasetName: '',
        generatedAt: '',
        rowCount: 0,
        columnCount: 0,
        totalCells: 0,
        overallScore: 0,
        dimensions: {} as any,
        nullCells: 0,
        duplicateRows: 0,
        outlierValues: 0,
        invalidValues: 0,
        inconsistentCategoryCount: 0,
        issues: [],
        aiReadiness: { schemaSummary: [], identifiedAnomalies: [], recommendedTransformations: [] },
      }
    }
    return assessDataQuality(
      datasetProfile.rawHeaders,
      datasetProfile.previewRows,
      datasetProfile.columns,
      datasetProfile.fileName,
    )
  }, [datasetProfile])

  const currentQualityReport: DataQualityReport = useMemo(() => {
    if (!datasetProfile) return initialQualityReport
    return assessDataQuality(
      currentSnapshot.headers,
      currentSnapshot.rows,
      currentColumns,
      datasetProfile.fileName,
    )
  }, [datasetProfile, currentSnapshot, currentColumns, initialQualityReport])

  // Commit a new transformation
  const handleCommitAction = (
    newHeaders: string[],
    newRows: Record<string, unknown>[],
    action: CleaningAction,
  ) => {
    const newSnapshot: DatasetSnapshot = {
      headers: newHeaders,
      rows: newRows as Record<string, string | number | boolean | null>[],
    }
    // Truncate any redo branch
    const nextSnapshots = snapshots.slice(0, snapshotIndex + 1)
    nextSnapshots.push(newSnapshot)

    setSnapshots(nextSnapshots)
    setSnapshotIndex(nextSnapshots.length - 1)
    setCleaningActions([...cleaningActions, action])
  }

  // Undo / Redo / Reset handlers
  const canUndo = snapshotIndex > 0
  const canRedo = snapshotIndex < snapshots.length - 1

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setSnapshotIndex((prev) => prev - 1)
    }
  }, [canUndo])

  const handleRedo = useCallback(() => {
    if (canRedo) {
      setSnapshotIndex((prev) => prev + 1)
    }
  }, [canRedo])

  const handleReset = () => {
    if (snapshots.length > 0) {
      setSnapshotIndex(0)
      setCleaningActions([])
    }
  }

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault()
          handleRedo()
        } else {
          e.preventDefault()
          handleUndo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '1320px', width: '100%', margin: '0 auto', padding: '1.75rem 1.5rem' }}>
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
                <span>⚡ Privacy-First Data Quality & Interactive Cleaning Engine</span>
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
                Assess & Clean Tabular Data with{' '}
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
                LocalLens processes your CSV files entirely inside your browser. Detect duplicates,
                impute missing values, resolve statistical outliers, harmonize text categories, and
                export production-ready datasets without sending records to any server.
              </p>
            </div>

            {/* File Upload / Sample Selector */}
            <FileUpload
              onProfileLoaded={handleProfileLoaded}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />

            {/* Architecture Cards */}
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
                #BuildHybridAI Platform Pipeline
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
                    <strong style={{ color: '#38bdf8' }}>Deterministic Cleaning Engine</strong>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Zero-cloud CSV parsing, exact/key duplicates, statistical IQR & Z-score outliers,
                    and reversible undo/redo transformations.
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
                    Request local Gemini Nano explanations in supported Chrome. Availability depends on
                    browser access, hardware and model download.
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
                    With your consent, Firebase AI Logic explains minimized aggregate statistics.
                    Suggestions require review and never modify your data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Top Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '1rem',
                marginBottom: '1.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                style={{ padding: '0.55rem 1.1rem', borderRadius: '8px',
                  border: '1px solid #0e7490', color: '#67e8f9', cursor: 'pointer',
                  background: activeTab === 'ai' ? '#164e63' : 'transparent' }}
              >
                ✦ AI Insights
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: activeTab === 'overview' ? '1px solid #38bdf8' : '1px solid transparent',
                  backgroundColor:
                    activeTab === 'overview' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: activeTab === 'overview' ? '#38bdf8' : '#94a3b8',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📊 Dataset Overview
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('quality')}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: activeTab === 'quality' ? '1px solid #10b981' : '1px solid transparent',
                  backgroundColor:
                    activeTab === 'quality' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: activeTab === 'quality' ? '#10b981' : '#94a3b8',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                🛡️ Data Quality
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                  }}
                >
                  {currentQualityReport.overallScore}/100
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('columns')}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: activeTab === 'columns' ? '1px solid #38bdf8' : '1px solid transparent',
                  backgroundColor:
                    activeTab === 'columns' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: activeTab === 'columns' ? '#38bdf8' : '#94a3b8',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🔬 Column Profiler
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cleaning')}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: activeTab === 'cleaning' ? '1px solid #c084fc' : '1px solid transparent',
                  backgroundColor:
                    activeTab === 'cleaning' ? 'rgba(192, 132, 252, 0.15)' : 'transparent',
                  color: activeTab === 'cleaning' ? '#c084fc' : '#94a3b8',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                🧹 Cleaning Workspace
                {cleaningActions.length > 0 && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '9999px',
                      backgroundColor: '#c084fc',
                      color: '#0f172a',
                      fontWeight: 700,
                    }}
                  >
                    {cleaningActions.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: activeTab === 'preview' ? '1px solid #38bdf8' : '1px solid transparent',
                  backgroundColor:
                    activeTab === 'preview' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: activeTab === 'preview' ? '#38bdf8' : '#94a3b8',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                👁️ Data Preview
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('export')}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: activeTab === 'export' ? '1px solid #38bdf8' : '1px solid transparent',
                  backgroundColor:
                    activeTab === 'export' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: activeTab === 'export' ? '#38bdf8' : '#94a3b8',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                💾 Export & Reports
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div>
                <DatasetOverview
                  profile={{
                    ...datasetProfile,
                    rowCount: currentSnapshot.rows.length,
                    columnCount: currentSnapshot.headers.length,
                    columns: currentColumns,
                    totalCells: currentSnapshot.rows.length * currentSnapshot.headers.length,
                    totalNullCells: currentQualityReport.nullCells,
                    overallMissingRate: Number(
                      (
                        (currentQualityReport.nullCells /
                          Math.max(
                            currentSnapshot.rows.length * currentSnapshot.headers.length,
                            1,
                          )) *
                        100
                      ).toFixed(1),
                    ),
                  }}
                  onReset={() => {
                    setDatasetProfile(null)
                    setSnapshots([])
                    setCleaningActions([])
                  }}
                />

                {/* Quick Quality Preview on Overview Tab */}
                <div style={{ marginTop: '1.5rem' }}>
                  <DataQualityDashboard
                    report={currentQualityReport}
                    onNavigateToTab={(tab) => setActiveTab(tab as any)}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: DATA QUALITY */}
            {activeTab === 'quality' && (
              <DataQualityDashboard
                report={currentQualityReport}
                onNavigateToTab={(tab) => setActiveTab(tab as any)}
              />
            )}

            {/* TAB 3: COLUMN PROFILES */}
            {activeTab === 'columns' && <ColumnProfileList columns={currentColumns} />}

            {/* TAB 4: CLEANING WORKSPACE */}
            {activeTab === 'cleaning' && (
              <CleaningWorkspace
                originalRows={datasetProfile.previewRows}
                currentHeaders={currentSnapshot.headers}
                currentRows={currentSnapshot.rows}
                columns={currentColumns}
                currentQualityReport={currentQualityReport}
                initialQualityReport={initialQualityReport}
                cleaningHistory={cleaningActions}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onReset={handleReset}
                onCommitAction={handleCommitAction}
                rules={validationRules}
                onAddRule={(r) => setValidationRules([...validationRules, r])}
                onRemoveRule={(id) => setValidationRules(validationRules.filter((r) => r.id !== id))}
              />
            )}

            {/* TAB 5: DATA PREVIEW */}
            {activeTab === 'preview' && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('cleaned')}
                      style={{
                        padding: '0.45rem 1rem',
                        borderRadius: '8px',
                        border:
                          previewMode === 'cleaned'
                            ? '1px solid #38bdf8'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor:
                          previewMode === 'cleaned' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                        color: previewMode === 'cleaned' ? '#ffffff' : '#94a3b8',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cleaned Dataset ({currentSnapshot.rows.length} rows)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('original')}
                      style={{
                        padding: '0.45rem 1rem',
                        borderRadius: '8px',
                        border:
                          previewMode === 'original'
                            ? '1px solid #38bdf8'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor:
                          previewMode === 'original' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                        color: previewMode === 'original' ? '#ffffff' : '#94a3b8',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Original Dataset ({datasetProfile.previewRows.length} rows)
                    </button>
                  </div>
                </div>

                <DataPreviewTable
                  headers={
                    previewMode === 'cleaned'
                      ? currentSnapshot.headers
                      : datasetProfile.rawHeaders
                  }
                  columns={previewMode === 'cleaned' ? currentColumns : datasetProfile.columns}
                  rows={
                    previewMode === 'cleaned'
                      ? currentSnapshot.rows
                      : datasetProfile.previewRows
                  }
                />
              </div>
            )}

            {activeTab === 'ai' && (
              <AIInsights
                key={`${snapshotIndex}-${cleaningActions.length}-${validationRules.length}`}
                profile={{
                  ...datasetProfile,
                  columns: currentColumns,
                  rawHeaders: currentSnapshot.headers,
                  previewRows: currentSnapshot.rows,
                  rowCount: currentSnapshot.rows.length,
                  columnCount: currentSnapshot.headers.length,
                  totalCells:
                    currentSnapshot.rows.length *
                    currentSnapshot.headers.length,
                  totalNullCells: currentQualityReport.nullCells,
                  overallMissingRate:
                    (currentQualityReport.nullCells /
                      Math.max(
                        1,
                        currentSnapshot.rows.length *
                          currentSnapshot.headers.length,
                      )) *
                    100,
                }}
                quality={currentQualityReport}
                history={cleaningActions}
              />
            )}

            {/* TAB 6: EXPORT */}
            {activeTab === 'export' && (
              <ExportPanel
                headers={currentSnapshot.headers}
                rows={currentSnapshot.rows}
                qualityReport={currentQualityReport}
                cleaningHistory={cleaningActions}
                datasetName={datasetProfile.fileName}
              />
            )}
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
        <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
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
