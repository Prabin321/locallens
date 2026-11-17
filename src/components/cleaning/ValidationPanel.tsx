import { useState, useMemo } from 'react'
import type { ValidationRule, RuleType } from '../../types/cleaning'
import type { ColumnProfile } from '../../types/dataset'
import { validateRules } from '../../lib/cleaner'

interface ValidationPanelProps {
  columns: ColumnProfile[]
  rows: Record<string, unknown>[]
  rules: ValidationRule[]
  onAddRule: (rule: ValidationRule) => void
  onRemoveRule: (ruleId: string) => void
}

export function ValidationPanel({
  columns,
  rows,
  rules,
  onAddRule,
  onRemoveRule,
}: ValidationPanelProps) {
  const [selectedCol, setSelectedCol] = useState<string>(columns[0]?.name || '')
  const [ruleType, setRuleType] = useState<RuleType>('range')
  const [minVal, setMinVal] = useState('')
  const [maxVal, setMaxVal] = useState('')
  const [allowedVals, setAllowedVals] = useState('')
  const [regexPattern, setRegexPattern] = useState('')

  // Real-time violation evaluation
  const validationResult = useMemo(() => {
    return validateRules(rows, rules)
  }, [rows, rules])

  const handleAdd = () => {
    if (!selectedCol) return

    const newRule: ValidationRule = {
      id: `rule-${Date.now()}`,
      column: selectedCol,
      ruleType,
      description: '',
    }

    if (ruleType === 'range') {
      if (minVal !== '') newRule.min = Number(minVal)
      if (maxVal !== '') newRule.max = Number(maxVal)
      newRule.description = `${selectedCol} must be between ${minVal || '-∞'} and ${maxVal || '+∞'}`
    } else if (ruleType === 'allowed_values') {
      const list = allowedVals.split(',').map((s) => s.trim()).filter(Boolean)
      if (list.length === 0) return
      newRule.allowedValues = list
      newRule.description = `${selectedCol} must be one of [${list.join(', ')}]`
    } else if (ruleType === 'required') {
      newRule.description = `${selectedCol} must not be empty or null`
    } else if (ruleType === 'regex') {
      if (!regexPattern.trim()) return
      newRule.pattern = regexPattern.trim()
      newRule.description = `${selectedCol} must match pattern /${regexPattern.trim()}/`
    }

    onAddRule(newRule)
    setMinVal('')
    setMaxVal('')
    setAllowedVals('')
    setRegexPattern('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
          Data Validation Rules & Value Constraints
        </h4>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
          Define domain-specific validation constraints to catch corrupt data cells, impossible negative values, or unrecognized categories.
        </p>
      </div>

      {/* Add New Rule Form */}
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.85rem' }}>
          Add New Validation Constraint:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
              Target Column
            </label>
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
              Constraint Type
            </label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as RuleType)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            >
              <option value="range">Numerical Range (Min / Max)</option>
              <option value="allowed_values">Allowed Categories Whitelist</option>
              <option value="required">Required Field (No Nulls)</option>
              <option value="regex">Regular Expression Pattern</option>
            </select>
          </div>
        </div>

        {/* Dynamic constraint inputs */}
        {ruleType === 'range' && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                Minimum Value
              </label>
              <input
                type="number"
                placeholder="e.g. 0"
                value={minVal}
                onChange={(e) => setMinVal(e.target.value)}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                  outline: 'none',
                  width: '130px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                Maximum Value
              </label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={maxVal}
                onChange={(e) => setMaxVal(e.target.value)}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                  outline: 'none',
                  width: '130px',
                }}
              />
            </div>
          </div>
        )}

        {ruleType === 'allowed_values' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
              Comma-Separated Allowed Categories
            </label>
            <input
              type="text"
              placeholder="e.g. Engineering, Product, Marketing, Sales"
              value={allowedVals}
              onChange={(e) => setAllowedVals(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '450px',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>
        )}

        {ruleType === 'regex' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
              Regex Pattern
            </label>
            <input
              type="text"
              placeholder="e.g. ^ORD-[0-9]{4}$"
              value={regexPattern}
              onChange={(e) => setRegexPattern(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '350px',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Add Rule
        </button>
      </div>

      {/* Configured Rules List */}
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.65rem' }}>
          Configured Rules ({rules.length}):
        </div>

        {rules.length === 0 ? (
          <div style={{ padding: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
            No custom rules configured yet. Add constraints above to automatically detect invalid entries.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rules.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600, marginRight: '0.5rem' }}>
                    [{r.ruleType.toUpperCase()}]
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#f8fafc' }}>{r.description}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveRule(r.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Remove ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rule Violations Results */}
      {rules.length > 0 && (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            backgroundColor: validationResult.violationCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
            border: `1px solid ${validationResult.violationCount > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: validationResult.violationCount > 0 ? '#f87171' : '#34d399' }}>
              Validation Status: {validationResult.violationCount} Violations Found
            </span>
          </div>

          {validationResult.violationCount === 0 ? (
            <div style={{ fontSize: '0.82rem', color: '#10b981' }}>
              ✅ All records satisfy every active validation constraint.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '220px', overflowY: 'auto' }}>
              {validationResult.violations.slice(0, 50).map((v, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: '0.78rem',
                    color: '#fca5a5',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    Row #{v.rowIdx} [{v.column}]: {v.reason}
                  </span>
                  <code style={{ color: '#ffffff', opacity: 0.8 }}>val: {String(v.value)}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
