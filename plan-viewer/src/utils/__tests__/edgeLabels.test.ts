import { describe, expect, it } from 'vitest'
import {
  composeGroupLabel,
  groupEdgesByPair,
  measureLabel,
  pairKey,
} from '../edgeLabels'

type Edge = {
  order: number
  source: string
  target: string
  label: string
  data: string
}

function edge(order: number, source: string, target: string, label = 'lbl', data = ''): Edge {
  return { order, source, target, label, data }
}

describe('pairKey', () => {
  it('is symmetric in its two arguments', () => {
    expect(pairKey('a', 'b')).toBe(pairKey('b', 'a'))
  })

  it('uses lexicographic order so different pairs never collide', () => {
    expect(pairKey('a', 'b')).not.toBe(pairKey('a', 'c'))
  })
})

describe('groupEdgesByPair', () => {
  it('groups by unordered pair and sorts each group by order', () => {
    const edges = [
      edge(3, 'b', 'a'),
      edge(1, 'a', 'b'),
      edge(2, 'a', 'c'),
    ]
    const groups = groupEdgesByPair(edges)
    expect(groups).toHaveLength(2)
    const ab = groups.find((g) => g.key === pairKey('a', 'b'))!
    expect(ab.edges.map((e) => e.order)).toEqual([1, 3])
    expect(ab.primary.order).toBe(1)
    expect(ab.hasReverse).toBe(true)
  })

  it('reports no reverse when all edges share a direction', () => {
    const groups = groupEdgesByPair([edge(1, 'a', 'b'), edge(2, 'a', 'b')])
    expect(groups).toHaveLength(1)
    expect(groups[0].hasReverse).toBe(false)
  })
})

describe('composeGroupLabel', () => {
  it('returns a plain label for a single edge', () => {
    const groups = groupEdgesByPair([edge(1, 'a', 'b', 'fetch', 'req')])
    expect(composeGroupLabel(groups[0])).toBe('1. fetch / req')
  })

  it('omits the data separator when data is empty', () => {
    const groups = groupEdgesByPair([edge(1, 'a', 'b', 'fetch', '')])
    expect(composeGroupLabel(groups[0])).toBe('1. fetch')
  })

  it('prefixes forward edges with → and reverse edges with ←', () => {
    const groups = groupEdgesByPair([
      edge(1, 'a', 'b', 'fetch', 'req'),
      edge(2, 'b', 'a', 'result', 'json'),
    ])
    const text = composeGroupLabel(groups[0])
    expect(text.split('\n')).toEqual([
      '→ 1. fetch / req',
      '← 2. result / json',
    ])
  })
})

describe('measureLabel', () => {
  it('returns a non-zero box even for empty text', () => {
    const { width, height } = measureLabel('')
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
  })

  it('grows with the number of newline-separated lines', () => {
    const one = measureLabel('hello')
    const three = measureLabel('hello\nworld\nfoo')
    expect(three.height).toBeGreaterThan(one.height)
  })

  it('treats CJK characters as wider than ASCII so labels reserve enough space', () => {
    const ascii = measureLabel('aaaaaaaa')
    const cjk = measureLabel('あああああああ')
    expect(cjk.width).toBeGreaterThan(ascii.width)
  })

  it('respects the widest line, not the last', () => {
    const text = 'short\nthis is the widest line by far'
    const { width } = measureLabel(text)
    expect(width).toBeGreaterThan(measureLabel('short').width)
  })
})
