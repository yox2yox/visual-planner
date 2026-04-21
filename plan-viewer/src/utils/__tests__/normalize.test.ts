import { describe, it, expect } from 'vitest'
import { normalizePlan } from '../normalize'
import type { Plan } from '../../types'

const baseGlossary = [{ id: 'a', type: 'feature' as const, name: 'A', description: '' }]

function makeState(label = 'call') {
  return {
    description: 'desc',
    interactions: [{ source: 'a', target: 'a', label, data: 'X' }],
  }
}

describe('normalizePlan', () => {
  it('returns pairs as-is when new format is used', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [
        { title: 'P1', currentState: makeState(), proposedState: makeState('P1-new') },
        { title: 'P2', proposedState: makeState('P2') },
      ],
    }
    const result = normalizePlan(plan)
    expect(result.pairs).toHaveLength(2)
    expect(result.pairs[0].title).toBe('P1')
    expect(result.pairs[1].title).toBe('P2')
    expect(result.pairs[1].currentState).toBeUndefined()
  })

  it('wraps legacy currentState/proposedState into a single pair', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      currentState: makeState('old'),
      proposedState: makeState('new'),
    }
    const result = normalizePlan(plan)
    expect(result.pairs).toHaveLength(1)
    expect(result.pairs[0].title).toBe('')
    expect(result.pairs[0].currentState?.interactions[0].label).toBe('old')
    expect(result.pairs[0].proposedState?.interactions[0].label).toBe('new')
  })

  it('wraps legacy with only currentState', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      currentState: makeState('only-current'),
    }
    const result = normalizePlan(plan)
    expect(result.pairs).toHaveLength(1)
    expect(result.pairs[0].currentState?.interactions[0].label).toBe('only-current')
    expect(result.pairs[0].proposedState).toBeUndefined()
  })

  it('throws when both pairs and legacy currentState are provided', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      currentState: makeState(),
      pairs: [{ title: 'P', proposedState: makeState() }],
    }
    expect(() => normalizePlan(plan)).toThrow(/both/i)
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

  it('filters out pairs that have neither currentState nor proposedState', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
      pairs: [
        { title: 'keep', proposedState: makeState() },
        { title: 'drop' },
        { title: 'also-keep', currentState: makeState() },
      ],
    }
    const result = normalizePlan(plan)
    expect(result.pairs).toHaveLength(2)
    expect(result.pairs.map((p) => p.title)).toEqual(['keep', 'also-keep'])
  })

  it('returns empty pairs when neither legacy nor pairs are present', () => {
    const plan: Plan = {
      title: 't',
      description: 'd',
      glossary: baseGlossary,
    }
    const result = normalizePlan(plan)
    expect(result.pairs).toEqual([])
  })
})
