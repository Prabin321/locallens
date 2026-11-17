import { describe, it, expect } from 'vitest'
import { parseStructuredAIResponse, parseChatResponse } from './responseParser'
import { content, context, claim } from './fixtures.test-support'

describe('AI response runtime validation', () => {
  it('accepts fully structured evidence-linked output', () =>
    expect(parseStructuredAIResponse(JSON.stringify(content), context)).toEqual(
      content,
    ))
  it('accepts JSON fences from device models', () =>
    expect(
      parseStructuredAIResponse(
        '```json\n' + JSON.stringify(content) + '\n```',
        context,
      ),
    ).toEqual(content))
  it.each(['null', '[]', 'nonsense', '{}', '{"summary":"guess"}'])(
    'rejects malformed response %s instead of inventing insights',
    (raw) => expect(() => parseStructuredAIResponse(raw, context)).toThrow(),
  )
  it('rejects unknown evidence IDs', () =>
    expect(() =>
      parseStructuredAIResponse(
        JSON.stringify({
          ...content,
          summary: { ...claim, evidence: ['invented.mean'] },
        }),
        context,
      ),
    ).toThrow(/evidence/))
  it('rejects empty evidence arrays', () =>
    expect(() =>
      parseStructuredAIResponse(
        JSON.stringify({ ...content, summary: { ...claim, evidence: [] } }),
        context,
      ),
    ).toThrow(/evidence/))
  it('rejects nested objects in text and wrong array members', () => {
    expect(() =>
      parseStructuredAIResponse(
        JSON.stringify({
          ...content,
          summary: { text: {}, evidence: claim.evidence },
        }),
        context,
      ),
    ).toThrow()
    expect(() =>
      parseStructuredAIResponse(
        JSON.stringify({ ...content, limitations: [9] }),
        context,
      ),
    ).toThrow()
  })
  it('requires cleaning recommendation risk notes', () =>
    expect(() =>
      parseStructuredAIResponse(
        JSON.stringify({ ...content, recommendations: [claim] }),
        context,
      ),
    ).toThrow())
  it('caps response size, text and arrays', () => {
    expect(() =>
      parseStructuredAIResponse('x'.repeat(60001), context),
    ).toThrow()
    expect(() =>
      parseStructuredAIResponse(
        JSON.stringify({
          ...content,
          summary: { ...claim, text: 'x'.repeat(3001) },
        }),
        context,
      ),
    ).toThrow()
    expect(() =>
      parseStructuredAIResponse(
        JSON.stringify({ ...content, insights: Array(21).fill(claim) }),
        context,
      ),
    ).toThrow()
  })
  it('validates chat and follow-up questions', () => {
    expect(
      parseChatResponse(
        JSON.stringify({ answer: claim, followUps: ['What next?'] }),
        context,
      ).answer,
    ).toEqual(claim)
    expect(() =>
      parseChatResponse(
        JSON.stringify({ answer: claim, followUps: [false] }),
        context,
      ),
    ).toThrow()
  })
  it('drops model-supplied provenance, tools and extra fields', () => {
    const result = parseStructuredAIResponse(
      JSON.stringify({
        ...content,
        inferenceSource: 'on_device',
        tool: 'deleteData',
      }),
      context,
    )
    expect(result).not.toHaveProperty('inferenceSource')
    expect(result).not.toHaveProperty('tool')
  })
})
