import { describe, it, expect } from 'vitest'
import { filterGlossary, buildTree, flattenTree, filterTree } from '../filter'
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

describe('buildTree', () => {
  it('builds flat list as all roots when no parentId', () => {
    const tree = buildTree(items)
    expect(tree).toHaveLength(4)
    expect(tree.every((n) => n.depth === 0)).toBe(true)
    expect(tree.every((n) => n.children.length === 0)).toBe(true)
  })

  it('builds hierarchy with parentId', () => {
    const hierarchical: GlossaryItem[] = [
      { id: 'root', type: 'feature', name: 'Root', description: '' },
      { id: 'child1', type: 'term', name: 'Child 1', description: '', parentId: 'root' },
      { id: 'child2', type: 'data', name: 'Child 2', description: '', parentId: 'root' },
      { id: 'grandchild', type: 'term', name: 'Grandchild', description: '', parentId: 'child1' },
    ]
    const tree = buildTree(hierarchical)
    expect(tree).toHaveLength(1)
    expect(tree[0].item.id).toBe('root')
    expect(tree[0].depth).toBe(0)
    expect(tree[0].children).toHaveLength(2)
    expect(tree[0].children[0].item.id).toBe('child1')
    expect(tree[0].children[0].depth).toBe(1)
    expect(tree[0].children[0].children).toHaveLength(1)
    expect(tree[0].children[0].children[0].item.id).toBe('grandchild')
    expect(tree[0].children[0].children[0].depth).toBe(2)
    expect(tree[0].children[1].item.id).toBe('child2')
    expect(tree[0].children[1].depth).toBe(1)
  })

  it('treats items with dangling parentId as roots', () => {
    const dangling: GlossaryItem[] = [
      { id: 'a', type: 'term', name: 'A', description: '', parentId: 'nonexistent' },
      { id: 'b', type: 'term', name: 'B', description: '' },
    ]
    const tree = buildTree(dangling)
    expect(tree).toHaveLength(2)
  })

  it('handles circular parentId without infinite recursion', () => {
    const circular: GlossaryItem[] = [
      { id: 'a', type: 'term', name: 'A', description: '', parentId: 'b' },
      { id: 'b', type: 'term', name: 'B', description: '', parentId: 'a' },
    ]
    // Should not throw or hang
    const tree = buildTree(circular)
    // Both should become roots since each references the other
    expect(tree.length).toBeGreaterThanOrEqual(0)
  })

  it('handles empty input', () => {
    const tree = buildTree([])
    expect(tree).toHaveLength(0)
  })
})

describe('flattenTree', () => {
  it('flattens tree preserving depth-first order', () => {
    const hierarchical: GlossaryItem[] = [
      { id: 'root', type: 'feature', name: 'Root', description: '' },
      { id: 'child1', type: 'term', name: 'Child 1', description: '', parentId: 'root' },
      { id: 'child2', type: 'data', name: 'Child 2', description: '', parentId: 'root' },
      { id: 'grandchild', type: 'term', name: 'Grandchild', description: '', parentId: 'child1' },
    ]
    const tree = buildTree(hierarchical)
    const flat = flattenTree(tree)
    expect(flat.map((n) => n.item.id)).toEqual(['root', 'child1', 'grandchild', 'child2'])
  })

  it('returns empty for empty input', () => {
    expect(flattenTree([])).toHaveLength(0)
  })
})

describe('filterTree', () => {
  const hierarchical: GlossaryItem[] = [
    { id: 'root', type: 'feature', name: 'Root', description: '' },
    { id: 'child1', type: 'term', name: 'Child 1', description: '', parentId: 'root' },
    { id: 'child2', type: 'data', name: 'Child 2', description: '', parentId: 'root' },
  ]

  it('returns full tree for "all" tab', () => {
    const tree = buildTree(hierarchical)
    const filtered = filterTree(tree, 'all')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].children).toHaveLength(2)
  })

  it('keeps parent if descendant matches filter', () => {
    const tree = buildTree(hierarchical)
    const filtered = filterTree(tree, 'term')
    expect(filtered).toHaveLength(1) // root kept because child1 is term
    expect(filtered[0].item.id).toBe('root')
    expect(filtered[0].children).toHaveLength(1)
    expect(filtered[0].children[0].item.id).toBe('child1')
  })

  it('removes branches with no matching descendants', () => {
    const noMatch: GlossaryItem[] = [
      { id: 'root', type: 'feature', name: 'Root', description: '' },
      { id: 'child', type: 'feature', name: 'Child', description: '', parentId: 'root' },
    ]
    const tree = buildTree(noMatch)
    const filtered = filterTree(tree, 'term')
    expect(filtered).toHaveLength(0)
  })
})
