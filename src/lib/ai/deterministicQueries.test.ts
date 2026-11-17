import { describe, it, expect } from 'vitest'
import { parseAndProfileCSV } from '../profiler'
import { assessDataQuality } from '../quality'
import { handleDeterministicQuery } from './deterministicQueries'
describe('Deterministic assistant compatibility', () => {
  it('uses the current cleaned profile and never confuses calculations with model inference', async () => {
    const p = await parseAndProfileCSV('amount\n1\n2\n3', 'local.csv', 10)
    const q = assessDataQuality(p.rawHeaders, p.previewRows, p.columns)
    expect(handleDeterministicQuery('how many rows?', p, q).answer).toContain(
      '3 rows',
    )
    expect(handleDeterministicQuery('quality score', p, q).handled).toBe(true)
    expect(
      handleDeterministicQuery('why is this happening?', p, q).handled,
    ).toBe(false)
    expect(handleDeterministicQuery('average amount', p, q).answer).toContain(
      'Mean:** 2',
    )
    expect(handleDeterministicQuery('average amount', p, q).answer).toContain(
      'do not establish distribution shape',
    )
  })
})
