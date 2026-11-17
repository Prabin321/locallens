import { useState } from 'react'
import { getFirebaseDiagnostics, type FirebaseDiagnostics } from '../lib/firebase'

export function FirebaseStatus() {
  const [diagnostics] = useState<FirebaseDiagnostics>(() => getFirebaseDiagnostics())

  const statusColor = diagnostics.isInitialized ? '#10b981' : '#ef4444'

  return (
    <div
      style={{
        margin: '1.5rem auto',
        maxWidth: '560px',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        textAlign: 'left',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '1rem', letterSpacing: '0.02em' }}>
          Firebase Initialization Status
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.2rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            backgroundColor: diagnostics.isInitialized
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            color: statusColor,
            border: `1px solid ${statusColor}`,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColor,
            }}
          />
          {diagnostics.isInitialized ? 'Initialized' : 'Not Initialized'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.5rem 1rem',
          fontSize: '0.85rem',
          lineHeight: '1.5',
          color: 'rgba(255, 255, 255, 0.85)',
        }}
      >
        <div>
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Project ID: </span>
          <code
            style={{
              padding: '0.1rem 0.3rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            {diagnostics.projectId ?? 'None'}
          </code>
        </div>
        <div>
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>App Instance: </span>
          <code
            style={{
              padding: '0.1rem 0.3rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            {diagnostics.appName ?? 'None'}
          </code>
        </div>
        <div>
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>SDK Version: </span>
          <span>v{diagnostics.sdkVersion}</span>
        </div>
        <div>
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>AI Architecture: </span>
          <span style={{ color: '#60a5fa' }}>firebase/ai (ready)</span>
        </div>
      </div>

      {diagnostics.hasPlaceholderApiKey && (
        <div
          style={{
            marginTop: '0.85rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.78rem',
            color: '#fbbf24',
          }}
        >
          ℹ️ Running with placeholder credentials. When ready for service calls, insert your
          web app keys in <code>.env.local</code>.
        </div>
      )}

      {diagnostics.missingKeys.length > 0 && (
        <div
          style={{
            marginTop: '0.85rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '0.78rem',
            color: '#f87171',
          }}
        >
          Missing environment variables: {diagnostics.missingKeys.join(', ')}
        </div>
      )}
    </div>
  )
}
