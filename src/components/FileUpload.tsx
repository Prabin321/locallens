import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { SAMPLE_DATASETS } from '../data/sampleDatasets'
import { parseAndProfileCSV } from '../lib/profiler'
import type { DatasetProfile, SampleDatasetOption } from '../types/dataset'

interface FileUploadProps {
  onProfileLoaded: (profile: DatasetProfile) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export function FileUpload({ onProfileLoaded, isLoading, setIsLoading }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setErrorMessage('Please select a valid CSV (.csv) file.')
      return
    }

    setErrorMessage(null)
    setIsLoading(true)

    try {
      const text = await file.text()
      const profile = await parseAndProfileCSV(text, file.name, file.size)
      onProfileLoaded(profile)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred while parsing the CSV file.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
  }

  const handleSampleClick = async (sample: SampleDatasetOption) => {
    setErrorMessage(null)
    setIsLoading(true)
    try {
      const blob = new Blob([sample.csvContent], { type: 'text/csv' })
      const profile = await parseAndProfileCSV(sample.csvContent, `${sample.id}.csv`, blob.size)
      onProfileLoaded(profile)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to parse sample dataset.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '820px', margin: '0 auto' }}>
      {/* Drag & Drop Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragOver ? '2px dashed #38bdf8' : '2px dashed rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          backgroundColor: isDragOver ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
          cursor: isLoading ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isDragOver ? '0 0 20px rgba(56, 189, 248, 0.2)' : 'none',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={isLoading}
        />

        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
          {isLoading ? '⏳' : '📊'}
        </div>

        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
          {isLoading ? 'Profiling Dataset Locally...' : 'Drag & Drop your CSV file here'}
        </h3>

        <p style={{ margin: '0 0 1.25rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>
          {isLoading
            ? 'Running deterministic in-browser analysis without cloud transmission'
            : 'or click to browse files from your computer (100% on-device processing)'}
        </p>

        <button
          type="button"
          disabled={isLoading}
          style={{
            padding: '0.65rem 1.5rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            transition: 'transform 0.15s ease',
          }}
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
        >
          {isLoading ? 'Processing...' : 'Browse CSV File'}
        </button>

        <div
          style={{
            marginTop: '1.25rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.78rem',
            color: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
          }}
        >
          <span>🔒</span>
          <span>Zero Server Upload: Raw data never leaves your browser sandbox</span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            fontSize: '0.88rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Sample Datasets for Instant Demo */}
      <div style={{ marginTop: '1.75rem', textAlign: 'left' }}>
        <div
          style={{
            fontSize: '0.85rem',
            color: '#94a3b8',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>🚀 Instant Demo Datasets</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(one-click test)</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {SAMPLE_DATASETS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => handleSampleClick(sample)}
              style={{
                padding: '0.85rem 1.1rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                cursor: isLoading ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)'
                e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  color: '#e2e8f0',
                  marginBottom: '0.25rem',
                }}
              >
                {sample.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                {sample.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
