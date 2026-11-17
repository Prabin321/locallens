import { useState, useMemo } from 'react'
import type { CaseNormalization } from '../../types/cleaning'
import type { ColumnProfile } from '../../types/dataset'
import { detectInconsistentCategories } from '../../lib/cleaner'

interface TextCleanPanelProps {
  columns: ColumnProfile[]
  rows: Record<string, unknown>[]
  onTrim: (column?: string) => void
  onNormalizeCase: (column: string, normalization: CaseNormalization) => void
  onReplaceCategory: (column: string, fromVal: string, toVal: string) => void
}

export function TextCleanPanel({
  columns,
  rows,
  onTrim,
  onNormalizeCase,
  onReplaceCategory,
}: TextCleanPanelProps) {
  const textColumns = columns.filter((c) => c.type === 'string' || c.type === 'boolean')
  const [selectedColName, setSelectedColName] = useState<string>(
    textColumns.length > 0 ? textColumns[0].name : '',
  )
  const [caseType, setCaseType] = useState<CaseNormalization>('title')
  const [fromCategory, setFromCategory] = useState('')
  const [toCategory, setToCategory] = useState('')

  // Inconsistent category groups for selected column
  const inconsistentGroups = useMemo(() => {
    if (!selectedColName) return []
    return detectInconsistentCategories(rows, selectedColName)
  }, [rows, selectedColName])

  if (textColumns.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
        No text or categorical columns detected in this dataset.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
          Text & Categorical Harmonization
        </h4>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
          Trim extraneous whitespace, normalize capitalization, harmonize inconsistent category labels, and preserve ID codes.
        </p>
      </div>

      {/* Target Column Selector */}
      <div
        style={{
          padding: '1rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.4rem' }}>
          Target Categorical Column:
        </label>
        <select
          value={selectedColName}
          onChange={(e) => setSelectedColName(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '380px',
            padding: '0.5rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            fontSize: '0.88rem',
            outline: 'none',
          }}
        >
          {textColumns.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.uniqueCount} unique categories)
            </option>
          ))}
        </select>
      </div>

      {/* Section 1: Whitespace Trimming */}
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
          1. Whitespace Trimming
        </h5>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#94a3b8' }}>
          Removes leading and trailing spaces that create invisible duplicate categories (e.g. <code>" Engineering "</code> vs <code>"Engineering"</code>).
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onTrim(selectedColName)}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Trim '{selectedColName}' Only
          </button>
          <button
            type="button"
            onClick={() => onTrim(undefined)}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#e2e8f0',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Trim All Columns Across Dataset
          </button>
        </div>
      </div>

      {/* Section 2: Capitalization Normalization */}
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
          2. Capitalization Normalization
        </h5>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#94a3b8' }}>
          Standardize casing format for '{selectedColName}'.
        </p>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={caseType}
            onChange={(e) => setCaseType(e.target.value as CaseNormalization)}
            style={{
              padding: '0.5rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          >
            <option value="title">Title Case (e.g. "Software Engineer")</option>
            <option value="lower">lowercase (e.g. "software engineer")</option>
            <option value="upper">UPPERCASE (e.g. "SOFTWARE ENGINEER")</option>
          </select>

          <button
            type="button"
            onClick={() => onNormalizeCase(selectedColName, caseType)}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Apply Normalization
          </button>
        </div>
      </div>

      {/* Section 3: Inconsistent Category Harmonization */}
      {inconsistentGroups.length > 0 && (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(168, 85, 247, 0.08)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🔍</span>
            <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f3e8ff' }}>
              Detected {inconsistentGroups.length} Inconsistent Category Label Groups in '{selectedColName}'
            </h5>
          </div>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#d8b4fe' }}>
            These variants share the same text but differ in capitalization or whitespace:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {inconsistentGroups.map((group) => {
              // Pick dominant variant by highest count
              const dominant = Object.entries(group.counts).sort((a, b) => b[1] - a[1])[0][0]
              return (
                <div
                  key={group.normalized}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.65rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
                      Group: "{group.normalized}"
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      Variants:{' '}
                      {group.variants.map((v) => (
                        <code
                          key={v}
                          style={{
                            marginRight: '0.4rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '4px',
                          }}
                        >
                          "{v}" ({group.counts[v]})
                        </code>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      for (const v of group.variants) {
                        if (v !== dominant) {
                          onReplaceCategory(selectedColName, v, dominant)
                        }
                      }
                    }}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #c084fc',
                      backgroundColor: 'rgba(192, 132, 252, 0.15)',
                      color: '#f3e8ff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Harmonize to "{dominant}"
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Section 4: Find and Replace Category */}
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
          3. Targeted Find & Replace
        </h5>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#94a3b8' }}>
          Map synonyms, abbreviations, or legacy codes in '{selectedColName}'.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="From value (e.g. NYC)"
            value={fromCategory}
            onChange={(e) => setFromCategory(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              fontSize: '0.82rem',
              outline: 'none',
              width: '180px',
            }}
          />
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>→</span>
          <input
            type="text"
            placeholder="To value (e.g. New York)"
            value={toCategory}
            onChange={(e) => setToCategory(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              fontSize: '0.82rem',
              outline: 'none',
              width: '180px',
            }}
          />

          <button
            type="button"
            disabled={!fromCategory.trim() || !toCategory.trim()}
            onClick={() => {
              onReplaceCategory(selectedColName, fromCategory, toCategory)
              setFromCategory('')
              setToCategory('')
            }}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background:
                fromCategory.trim() && toCategory.trim()
                  ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                  : '#334155',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: fromCategory.trim() && toCategory.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Replace Category
          </button>
        </div>
      </div>
    </div>
  )
}
