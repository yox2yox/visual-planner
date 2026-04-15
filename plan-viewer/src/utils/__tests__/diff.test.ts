import { describe, it, expect } from 'vitest'
import { computeDiffEdges } from '../diff'
import type { Interaction } from '../../types'

const base: Interaction = { source: 'a', target: 'b', label: 'L', data: 'D' }

describe('computeDiffEdges', () => {
  it('marks an edge only in proposed as added', () => {
    const result = computeDiffEdges([], [base])
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('added')
  })

  it('marks an edge only in current as removed', () => {
    const result = computeDiffEdges([base], [])
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('removed')
  })

  it('marks an identical edge as unchanged', () => {
    const result = computeDiffEdges([base], [base])
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('unchanged')
  })

  it('marks an edge with changed label as changed', () => {
    const modified: Interaction = { ...base, label: 'New' }
    const result = computeDiffEdges([base], [modified])
    expect(result[0].status).toBe('changed')
  })

  it('marks an edge with changed data as changed', () => {
    const modified: Interaction = { ...base, data: 'New' }
    const result = computeDiffEdges([base], [modified])
    expect(result[0].status).toBe('changed')
  })

  it('handles multiple edges with mixed statuses', () => {
    const current: Interaction[] = [
      { source: 'a', target: 'b', label: 'L', data: 'D' },
      { source: 'b', target: 'c', label: 'L2', data: 'D2' },
    ]
    const proposed: Interaction[] = [
      { source: 'a', target: 'b', label: 'L-new', data: 'D' },
      { source: 'c', target: 'd', label: 'L3', data: 'D3' },
    ]
    const result = computeDiffEdges(current, proposed)
    const statusMap = Object.fromEntries(
      result.map((e) => [`${e.source}-${e.target}`, e.status])
    )
    expect(statusMap['a-b']).toBe('changed')
    expect(statusMap['b-c']).toBe('removed')
    expect(statusMap['c-d']).toBe('added')
  })
})
