import { describe, it, expect } from 'vitest'
import { insightMarkdown } from './export'
import { content, context } from './fixtures.test-support'
import type { InsightReport } from '../../types/ai'
const report: InsightReport = {
  ...content,
  inferenceSource: 'in_cloud',
  modelUsed: 'test',
  requestedMode: 'prefer_on_device',
  generatedAt: '2026-11-17T00:00:00Z',
  evidence: context.facts,
}
describe('Insight export', () => {
  it('includes actual provenance, evidence snapshot, risks and limitations', () => {
    const md = insightMarkdown(report)
    for (const text of [
      'in_cloud',
      'prefer_on_device',
      'dataset.rows',
      'Row count = 20',
      'Review before',
      'No causal evidence',
      'not applied',
    ])
      expect(md).toContain(text)
  })
  it('neutralizes active HTML and Markdown links in shareable reports', () => {
    const md = insightMarkdown({
      ...report,
      summary: {
        text: '<script>alert(1)</script> [click](javascript:alert(1))',
        evidence: ['dataset.rows'],
      },
    })
    expect(md).not.toContain('<script>')
    expect(md).not.toContain('[click]')
  })
})
