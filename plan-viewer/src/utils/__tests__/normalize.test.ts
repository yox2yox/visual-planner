import { describe, it, expect } from 'vitest'
import { normalizePlan } from '../normalize'
import type { Plan } from '../../types'

const baseGlossary = [{ id: 'a', type: 'server' as const, name: 'A', description: '' }]

function makeState(label = 'call') {
  return {
    architectureDiagram: [{ order: 1, source: 'a', target: 'a', label, data: 'X' }],
  }
}

describe('normalizePlan', () => {
  it('returns concerns as-is when content is present', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [
        {
          title: 'C1',
          examples: [
            { title: 'ex1', currentState: makeState(), proposedState: makeState('C1-new') },
          ],
        },
        {
          title: 'C2',
          examples: [{ title: 'ex2', proposedState: makeState('C2') }],
        },
      ],
    }
    const result = normalizePlan(plan)
    expect(result.pairs).toHaveLength(2)
    expect(result.pairs[0].title).toBe('C1')
    expect(result.pairs[1].examples?.[0].currentState).toBeUndefined()
  })

  it('throws when pairs is an empty array', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [],
    }
    expect(() => normalizePlan(plan)).toThrow(/empty/i)
  })

  it('filters out concerns that have neither examples, safeguards, nor takeaway', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [
        { title: 'keep', examples: [{ title: 'e', proposedState: makeState() }] },
        { title: 'drop' },
        { title: 'also-keep', safeguards: ['be careful'] },
      ],
    }
    const result = normalizePlan(plan)
    expect(result.pairs).toHaveLength(2)
    expect(result.pairs.map((p) => p.title)).toEqual(['keep', 'also-keep'])
  })

  it('keeps explanation-only concerns without diagrams', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [
        {
          title: 'explain',
          takeaway: 'pithy summary',
        },
      ],
    }
    const result = normalizePlan(plan)
    expect(result.pairs).toHaveLength(1)
    expect(result.pairs[0].title).toBe('explain')
  })
})
