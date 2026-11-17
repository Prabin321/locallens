import { useMemo, useRef, useEffect, useState } from 'react'
import { InferenceMode } from 'firebase/ai'
import type { DatasetProfile } from '../../types/dataset'
import type { DataQualityReport } from '../../types/quality'
import type { CleaningAction } from '../../types/cleaning'
import type {
  ConversationTurn,
  DeviceState,
  GroundedClaim,
  InsightReport,
} from '../../types/ai'
import {
  buildPrivacyPreservingContext,
  isSensitiveColumn,
  MIN_AGGREGATE_ROWS,
  MAX_CONTEXT_COLUMNS,
} from '../../lib/ai/contextBuilder'
import {
  generateInsights,
  askAssistant,
  explainAIError,
} from '../../lib/ai/inference'
import { handleDeterministicQuery } from '../../lib/ai/deterministicQueries'
import { downloadInsights } from '../../lib/ai/export'
import './AIInsights.css'

const modes = [
  [InferenceMode.ONLY_ON_DEVICE, 'On-device only — no cloud fallback'],
  [InferenceMode.PREFER_ON_DEVICE, 'Prefer on-device — cloud fallback allowed'],
  [InferenceMode.ONLY_IN_CLOUD, 'Cloud only'],
  [
    InferenceMode.PREFER_IN_CLOUD,
    'Prefer cloud — on-device fallback when supported',
  ],
] as const
interface Message {
  role: 'user' | 'assistant'
  text: string
  source?: string
  evidence?: string[]
}
export function AIInsights({
  profile,
  quality,
  history,
}: {
  profile: DatasetProfile
  quality: DataQualityReport
  history: CleaningAction[]
}) {
  const [mode, setMode] = useState<InferenceMode>(InferenceMode.ONLY_ON_DEVICE)
  const [consent, setConsent] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [report, setReport] = useState<InsightReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [device, setDevice] = useState<DeviceState>('uninitialized')
  const [progress, setProgress] = useState(0)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [followUps, setFollowUps] = useState<string[]>([])
  const alive = useRef(true)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      controller.current?.abort()
    }
  }, [])
  const context = useMemo(
    () => buildPrivacyPreservingContext(profile, quality, selected),
    [profile, quality, selected],
  )
  const cloudCapable = mode !== InferenceMode.ONLY_ON_DEVICE
  const canRequest = !busy && (!cloudCapable || consent)
  const options = {
    mode,
    cloudConsent: consent,
    onDeviceState: (state: DeviceState, value?: number) => {
      if (alive.current) {
        setDevice(state)
        if (value !== undefined) setProgress(value)
      }
    },
  }
  function resetContext() {
    setConsent(false)
    setReport(null)
    setMessages([])
    setTurns([])
    setFollowUps([])
    setError('')
  }
  async function analyze() {
    setBusy(true)
    setError('')
    try {
      controller.current = new AbortController()
      const result = await generateInsights(context, {
        ...options,
        signal: controller.current.signal,
      })
      if (alive.current) setReport(result)
    } catch (e) {
      if (alive.current) setError(explainAIError(e))
    } finally {
      if (alive.current) setBusy(false)
    }
  }
  async function ask(text = question) {
    if (!text.trim() || busy) return
    setQuestion('')
    setError('')
    const local = handleDeterministicQuery(text, profile, quality, history)
    setMessages((prev) => [...prev, { role: 'user', text }])
    if (local.handled) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: local.answer!,
          source: 'Local deterministic calculation (no model)',
          evidence: local.citations,
        },
      ])
      return
    }
    if (!canRequest) {
      setError(
        'Choose on-device only or consent before sending questions to a cloud-capable mode.',
      )
      return
    }
    setBusy(true)
    try {
      controller.current = new AbortController()
      const reply = await askAssistant(context, text, turns, {
        ...options,
        signal: controller.current.signal,
      })
      if (alive.current) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: reply.answer.text,
            source: `${reply.inferenceSource} · ${reply.modelUsed}`,
            evidence: reply.answer.evidence,
          },
        ])
        setTurns((prev) => [
          ...prev.slice(-3),
          { question: text, answer: reply.answer.text },
        ])
        setFollowUps(reply.followUps)
      }
    } catch (e) {
      if (alive.current) setError(explainAIError(e))
    } finally {
      if (alive.current) setBusy(false)
    }
  }
  const renderClaim = (claim: GroundedClaim, i: number) => (
    <article className="ai-claim" key={i}>
      <p>{claim.text}</p>
      {'risk' in claim && (
        <p className="ai-risk">Review risk: {String(claim.risk)}</p>
      )}
      <details>
        <summary>Inspect evidence ({claim.evidence.length})</summary>
        <ul>
          {claim.evidence.map((id) => {
            const fact = report?.evidence.find((f) => f.id === id)
            return (
              <li key={id}>
                {id}: {fact?.label} = {String(fact?.value)}
              </li>
            )
          })}
        </ul>
      </details>
    </article>
  )
  return (
    <section className="ai-workspace" aria-label="AI Insights">
      <header className="ai-heading">
        <div>
          <span className="ai-eyebrow">CHECKPOINT 3 · HYBRID INTELLIGENCE</span>
          <h2>Understand your data. Keep control.</h2>
          <p>
            Evidence-linked explanations and cleaning advice. AI never changes
            your dataset.
          </p>
        </div>
        <span className="ai-badge">Private by default</span>
      </header>
      <div className="ai-layout">
        <aside className="ai-card">
          <h3>Inference & privacy</h3>
          <label htmlFor="ai-mode">Inference mode</label>
          <select
            id="ai-mode"
            value={mode}
            disabled={busy}
            onChange={(e) => {
              setMode(e.target.value as InferenceMode)
              setConsent(false)
              setDevice('uninitialized')
            }}
          >
            {modes.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="ai-muted">
            Device model: {device}
            {device === 'downloading'
              ? ` (${Math.round(progress * 100)}%)`
              : ''}
            . Supported desktop Chrome, Prompt API access, a secure context and
            available resources are required. The first request may download
            Gemini Nano.
          </p>
          <p>
            Default disclosure: dataset counts and quality scores. No raw rows,
            filenames, category values, exact dates or free-text cleaning
            history.
          </p>
          <details>
            <summary>Choose optional aggregate columns</summary>
            <p>
              Names stay local. Sensitive-name matches are excluded; also
              exclude sensitive fields you recognize. Small datasets (under{' '}
              {MIN_AGGREGATE_ROWS} rows) disclose no column statistics.
            </p>
            {profile.columns.map((c, i) => (
              <label className="ai-check" key={c.name}>
                <input
                  type="checkbox"
                  disabled={
                    busy ||
                    isSensitiveColumn(c.name) ||
                    profile.rowCount < MIN_AGGREGATE_ROWS ||
                    (!selected.includes(c.name) &&
                      selected.length >= MAX_CONTEXT_COLUMNS)
                  }
                  checked={selected.includes(c.name)}
                  onChange={(e) => {
                    setSelected((prev) =>
                      e.target.checked
                        ? [...prev, c.name]
                        : prev.filter((v) => v !== c.name),
                    )
                    resetContext()
                  }}
                />
                <span>
                  {c.name} → column_{i + 1}
                  {isSensitiveColumn(c.name) ? ' (excluded)' : ''}
                </span>
              </label>
            ))}
          </details>
          <details>
            <summary>Inspect exact aggregate payload</summary>
            <pre>{JSON.stringify(context, null, 2)}</pre>
          </details>
          {cloudCapable && (
            <label className="ai-check ai-consent">
              <input
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                I authorize sending the displayed aggregates, my typed questions
                and the last four AI conversation turns to Firebase/Google cloud
                models, including fallback. I will not enter personal data.
                Aggregates may still be sensitive. Uncheck to revoke future
                cloud requests.
              </span>
            </label>
          )}
          <button
            className="ai-primary"
            disabled={!canRequest}
            onClick={analyze}
          >
            {busy ? 'Working…' : 'Generate AI insights'}
          </button>
          {busy && (
            <button onClick={() => controller.current?.abort()}>
              Cancel request
            </button>
          )}
          <p className="ai-muted">
            No inference runs automatically. Changing aggregates clears consent
            and AI history. Switching tabs or changing data resets this
            workspace. In-flight requests already sent cannot be recalled.
          </p>
        </aside>
        <div className="ai-results">
          {error && (
            <div role="alert" className="ai-error">
              {error}
            </div>
          )}
          {report ? (
            <div className="ai-card">
              <div className="ai-report-header">
                <h3>Dataset intelligence</h3>
                <div>
                  <button onClick={() => downloadInsights(report, 'md')}>
                    Markdown
                  </button>
                  <button onClick={() => downloadInsights(report, 'json')}>
                    JSON
                  </button>
                </div>
              </div>
              <p className="ai-badge">
                Actual source: {report.inferenceSource} · {report.modelUsed}
              </p>
              <p className="ai-muted">
                {report.generatedAt} · Requested: {report.requestedMode}
              </p>
              <p>
                AI interpretations need review. Evidence IDs are validated; this
                does not prove every claim.
              </p>
              <h4>Dataset summary</h4>
              {renderClaim(report.summary, 0)}
              {(
                [
                  ['quality', 'Quality explained'],
                  ['insights', 'Analytical observations'],
                  ['recommendations', 'Suggested manual cleaning'],
                  ['nextSteps', 'Next analyses'],
                ] as const
              ).map(([key, title]) => (
                <section key={key}>
                  <h4>{title}</h4>
                  {report[key].length ? (
                    report[key].map(renderClaim)
                  ) : (
                    <p>No supported suggestions.</p>
                  )}
                </section>
              ))}
              <h4>Limitations</h4>
              <ul>
                {report.limitations.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="ai-card ai-empty">
              <h3>From statistics to understanding</h3>
              <p>
                Generate a summary, quality explanations, analytical
                observations and reversible cleaning recommendations. Review the
                payload and choose where inference may run.
              </p>
              <div className="ai-feature-grid">
                <span>Evidence references</span>
                <span>No automatic edits</span>
                <span>Actual source reporting</span>
              </div>
            </div>
          )}
          <div className="ai-card">
            <h3>Ask your data</h3>
            <p className="ai-muted">
              Counts and supported statistical questions are answered locally.
              Other questions use your selected mode and consent. Follow-ups
              include up to four prior AI turns; deterministic replies stay
              local.
            </p>
            <div className="ai-conversation" aria-live="polite">
              {messages.map((m, i) => (
                <article key={i} className={`ai-message ai-${m.role}`}>
                  <strong>{m.role === 'user' ? 'You' : m.source}</strong>
                  <p>{m.text}</p>
                  {m.evidence && (
                    <small>Evidence: {m.evidence.join(', ')}</small>
                  )}
                </article>
              ))}
            </div>
            <div className="ai-followups">
              {followUps.map((text, i) => (
                <button
                  key={i}
                  disabled={busy}
                  onClick={() => setQuestion(text)}
                >
                  {text}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void ask()
              }}
            >
              <label htmlFor="ai-question">
                Question (avoid sensitive information)
              </label>
              <textarea
                id="ai-question"
                value={question}
                maxLength={1500}
                disabled={busy}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="How many rows are there? What should I review first?"
              />
              <button
                className="ai-primary"
                disabled={busy || !question.trim()}
              >
                Ask assistant
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
