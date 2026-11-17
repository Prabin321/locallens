import type { GroundedClaim, InsightReport } from '../../types/ai'
const plain = (s: string) =>
  s.replace(/[<>[\]`*_#!|\\]/g, '').replace(/\r?\n/g, ' ')
export function insightMarkdown(report: InsightReport): string {
  const claim = (c: GroundedClaim) =>
    `${plain(c.text)}\n\nEvidence: ${c.evidence.map(plain).join(', ')}`
  const sections = [
    '# LocalLens AI Insights',
    `Generated: ${report.generatedAt}\n\nActual source: ${report.inferenceSource}\n\nModel: ${plain(report.modelUsed)}\n\nRequested mode: ${report.requestedMode}`,
    'Model interpretations require review; valid citations do not verify every claim. Recommendations were not applied.',
    `## Summary\n\n${claim(report.summary)}`,
    ...(['quality', 'insights', 'recommendations', 'nextSteps'] as const).map(
      (key) =>
        `## ${key}\n\n${report[key].map((c) => `${claim(c)}${'risk' in c ? `\n\nRisk: ${plain(c.risk)}` : ''}`).join('\n\n')}`,
    ),
    `## Limitations\n\n${report.limitations.map(plain).join('\n\n')}`,
    `## Evidence snapshot\n\n${report.evidence.map((f) => `${plain(f.id)}: ${plain(f.label)} = ${plain(String(f.value))}`).join('\n\n')}`,
  ]
  return sections.join('\n\n')
}
export function downloadInsights(report: InsightReport, format: 'json' | 'md') {
  const url = URL.createObjectURL(
    new Blob(
      [
        format === 'json'
          ? JSON.stringify(report, null, 2)
          : insightMarkdown(report),
      ],
      { type: format === 'json' ? 'application/json' : 'text/markdown' },
    ),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `locallens-insights.${format}`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
