import { describe, it, expect } from 'vitest'
import { filterGlossary } from '../filter'
import type { GlossaryItem } from '../../types'

const items: GlossaryItem[] = [
  { id: '1', type: 'term', name: 'Term A', description: '' },
  { id: '2', type: 'feature', name: 'Feature B', description: '' },
  { id: '3', type: 'data', name: 'Data C', description: '' },
  { id: '4', type: 'term', name: 'Term D', description: '' },
]

describe('filterGlossary', () => {
  it('returns all items for "all" tab', () => {
    expect(filterGlossary(items, 'all')).toHaveLength(4)
  })

  it('filters by term', () => {
    const result = filterGlossary(items, 'term')
    expect(result).toHaveLength(2)
    expect(result.every((i) => i.type === 'term')).toBe(true)
  })

  it('filters by feature', () => {
    const result = filterGlossary(items, 'feature')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('filters by data', () => {
    const result = filterGlossary(items, 'data')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('returns empty array when no match', () => {
    expect(filterGlossary([], 'term')).toHaveLength(0)
  })
})
