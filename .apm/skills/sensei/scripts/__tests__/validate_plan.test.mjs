import { describe, it, expect } from 'vitest'

import { validatePlan } from '../validate_plan.mjs'
import { validateReferences } from '../lib/plan-schema.zod.mjs'

function basePlan(overrides = {}) {
  return {
    title: 't',
    description: 'd',
    glossary: [
      { id: 'a', type: 'client', name: 'A' },
      { id: 'b', type: 'server', name: 'B' },
    ],
    ...overrides,
  }
}

const okEdge = { order: 1, source: 'a', target: 'b', label: 'calls', data: 'X' }

describe('validatePlan (JSON Schema + zod)', () => {
  it('accepts a minimal valid plan', () => {
    const result = validatePlan(
      basePlan({ proposedState: { architectureEdges: [okEdge] } }),
    )
    expect(result.ok).toBe(true)
  })

  it('reports json-schema errors when a required field is missing', () => {
    const result = validatePlan({ glossary: [{ id: 'a', type: 'client', name: 'A' }] })
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.source === 'json-schema')).toBe(true)
    expect(result.errors.some((e) => /title/.test(e.message))).toBe(true)
  })

  it('reports json-schema error for an unknown glossary type', () => {
    const plan = basePlan({
      glossary: [{ id: 'a', type: 'unknown', name: 'A' }],
    })
    const result = validatePlan(plan)
    expect(result.ok).toBe(false)
    expect(result.errors[0].source).toBe('json-schema')
  })

  it('reports json-schema error when pairs and currentState coexist', () => {
    const plan = basePlan({
      currentState: { architectureEdges: [okEdge] },
      pairs: [{ title: 'P' }],
    })
    const result = validatePlan(plan)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => /NOT be valid|not/.test(e.message))).toBe(true)
  })

  it('rejects extra unknown properties (additionalProperties=false)', () => {
    const plan = basePlan({ foo: 'bar' })
    const result = validatePlan(plan)
    expect(result.ok).toBe(false)
    expect(result.errors[0].source).toBe('json-schema')
  })

  it('reports references error for unknown architecture edge source id', () => {
    const plan = basePlan({
      proposedState: {
        architectureEdges: [{ order: 1, source: 'ghost', target: 'b', label: 'x', data: 'y' }],
      },
    })
    const result = validatePlan(plan)
    expect(result.ok).toBe(false)
    expect(result.errors[0].source).toBe('references')
    expect(result.errors[0].path).toMatch(/source/)
  })
})

describe('validateReferences (cross-field constraints)', () => {
  it('detects duplicate glossary ids', () => {
    const errors = validateReferences(
      basePlan({
        glossary: [
          { id: 'a', type: 'client', name: 'A' },
          { id: 'a', type: 'server', name: 'A2' },
        ],
      }),
    )
    expect(errors.some((e) => /duplicate/.test(e.message))).toBe(true)
  })

  it('detects unknown parentId', () => {
    const errors = validateReferences(
      basePlan({
        glossary: [
          { id: 'a', type: 'client', name: 'A', parentId: 'ghost' },
        ],
      }),
    )
    expect(errors.some((e) => /unknown parentId/.test(e.message))).toBe(true)
  })

  it('detects parentId cycles', () => {
    const errors = validateReferences(
      basePlan({
        glossary: [
          { id: 'a', type: 'client', name: 'A', parentId: 'b' },
          { id: 'b', type: 'server', name: 'B', parentId: 'a' },
        ],
      }),
    )
    expect(errors.some((e) => /cycle/.test(e.message))).toBe(true)
  })

  it('rejects nesting depth greater than 3', () => {
    const errors = validateReferences({
      title: 't',
      description: 'd',
      glossary: [
        { id: 'a', type: 'client', name: 'A' },
        { id: 'b', type: 'server', name: 'B', parentId: 'a' },
        { id: 'c', type: 'function', name: 'C', parentId: 'b' },
        { id: 'd', type: 'function', name: 'D', parentId: 'c' },
      ],
    })
    expect(errors.some((e) => /nesting depth/.test(e.message))).toBe(true)
  })

  it('requires architectureEdges.order to be consecutive from 1', () => {
    const errors = validateReferences(
      basePlan({
        proposedState: {
          architectureEdges: [
            { order: 1, source: 'a', target: 'b', label: 'x', data: 'y' },
            { order: 3, source: 'a', target: 'b', label: 'x', data: 'y' },
          ],
        },
      }),
    )
    expect(errors.some((e) => /must be 2/.test(e.message))).toBe(true)
  })

  it('validates diagram.edges keys (order or source->target)', () => {
    const errors = validateReferences(
      basePlan({
        proposedState: {
          architectureEdges: [okEdge],
          diagram: {
            edges: {
              '1': {},
              'a->b': {},
              'a->ghost': {},
              '99': {},
              'weird': {},
            },
          },
        },
      }),
    )
    const messages = errors.map((e) => e.message).join('\n')
    expect(messages).toMatch(/target id unknown/)
    expect(messages).toMatch(/unknown architecture edge order in this state: 99/)
    expect(messages).toMatch(/source->target/)
  })

  it('returns empty array for a valid plan', () => {
    const errors = validateReferences(
      basePlan({ proposedState: { architectureEdges: [okEdge] } }),
    )
    expect(errors).toEqual([])
  })
})
