import type { DatasetContext, InsightContent } from '../../types/ai'
export const context: DatasetContext = {
  version: 1,
  facts: [{ id: 'dataset.rows', label: 'Row count', value: 20 }],
  omittedColumns: 0,
  policy: 'test',
}
export const claim = { text: 'There are 20 rows.', evidence: ['dataset.rows'] }
export const content: InsightContent = {
  summary: claim,
  quality: [claim],
  insights: [claim],
  recommendations: [{ ...claim, risk: 'Review before removing records.' }],
  nextSteps: [claim],
  limitations: ['No causal evidence.'],
}
