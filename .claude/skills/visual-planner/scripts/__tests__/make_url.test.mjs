import { describe, it, expect } from 'vitest'
import { validate } from '../make_url.mjs'

function makePlan(overrides = {}) {
  return {
    title: 't',
    glossary: [
      { id: 'a', type: 'feature', name: 'A' },
      { id: 'b', type: 'feature', name: 'B' },
    ],
    ...overrides,
  }
}

const okEdge = { source: 'a', target: 'b', label: 'calls', data: 'X' }

describe('validate (make_url.mjs)', () => {
  it('accepts a plan using the legacy currentState/proposedState', () => {
    const plan = makePlan({
      currentState: { interactions: [okEdge] },
      proposedState: { interactions: [okEdge] },
    })
    expect(() => validate(plan)).not.toThrow()
  })

  it('accepts a plan using the new pairs format', () => {
    const plan = makePlan({
      pairs: [
        { title: 'P1', currentState: { interactions: [okEdge] } },
        { title: '', proposedState: { interactions: [okEdge] } },
      ],
    })
    expect(() => validate(plan)).not.toThrow()
  })

  it('accepts a pair with neither currentState nor proposedState (viewer will filter)', () => {
    const plan = makePlan({
      pairs: [{ title: 'empty' }],
    })
    expect(() => validate(plan)).not.toThrow()
  })

  it('rejects when pairs is not an array', () => {
    const plan = makePlan({ pairs: { title: 'P' } })
    expect(() => validate(plan)).toThrow(/pairs.*array/i)
  })

  it('rejects an empty pairs array', () => {
    const plan = makePlan({ pairs: [] })
    expect(() => validate(plan)).toThrow(/empty/i)
  })

  it('rejects when pairs[i].title is not a string', () => {
    const plan = makePlan({
      pairs: [{ title: 123, proposedState: { interactions: [okEdge] } }],
    })
    expect(() => validate(plan)).toThrow(/pairs\[0\]\.title.*string/)
  })

  it('rejects when pairs and top-level currentState are both provided', () => {
    const plan = makePlan({
      currentState: { interactions: [okEdge] },
      pairs: [{ title: 'P', proposedState: { interactions: [okEdge] } }],
    })
    expect(() => validate(plan)).toThrow(/both.*pairs/i)
  })

  it('rejects when pairs[i].currentState.interactions[j].source is unknown (with path in error)', () => {
    const plan = makePlan({
      pairs: [
        {
          title: 'P',
          currentState: {
            interactions: [{ source: 'ghost', target: 'b', label: 'x', data: 'y' }],
          },
        },
      ],
    })
    expect(() => validate(plan)).toThrow(/pairs\[0\]\.currentState\.interactions\[0\]\.source/)
  })

  it('rejects when pairs[i].proposedState.interactions[j].target is unknown (with path in error)', () => {
    const plan = makePlan({
      pairs: [
        {
          title: 'P',
          proposedState: {
            interactions: [{ source: 'a', target: 'ghost', label: 'x', data: 'y' }],
          },
        },
      ],
    })
    expect(() => validate(plan)).toThrow(/pairs\[0\]\.proposedState\.interactions\[0\]\.target/)
  })
})
