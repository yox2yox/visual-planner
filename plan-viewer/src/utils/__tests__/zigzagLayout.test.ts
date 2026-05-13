import { describe, expect, it } from 'vitest'
import type { PositionedNode } from '../edgeRouting'
import type { ElkLayoutNode } from '../elkLayout'
import type { GlossaryItem } from '../../types'
import { applyZigzag } from '../zigzagLayout'

function item(id: string): GlossaryItem {
  return { id, type: 'server', name: id, description: '' }
}

function leaf(id: string, x: number, y: number, w = 200, h = 60): ElkLayoutNode {
  return {
    id,
    position: { x, y },
    width: w,
    height: h,
    isGroup: false,
    item: item(id),
  }
}

function group(id: string, x: number, y: number, w = 240, h = 200): ElkLayoutNode {
  return {
    id,
    position: { x, y },
    width: w,
    height: h,
    isGroup: true,
    item: item(id),
  }
}

function child(id: string, parentId: string, x: number, y: number): ElkLayoutNode {
  return {
    id,
    position: { x, y },
    width: 200,
    height: 60,
    parentId,
    isGroup: false,
    item: item(id),
  }
}

function ap(id: string, x: number, y: number, w = 200, h = 60): PositionedNode {
  return { id, x, y, width: w, height: h }
}

function makeInput(nodes: ElkLayoutNode[], absolute: PositionedNode[], totalHeight = 200) {
  return {
    nodes,
    absolutePositions: new Map(absolute.map((p) => [p.id, p])),
    totalHeight,
  }
}

describe('applyZigzag', () => {
  it('staggers every other single-leaf column when at least minColumns of them line up', () => {
    const nodes = [
      leaf('a', 0, 50),
      leaf('b', 300, 50),
      leaf('c', 600, 50),
      leaf('d', 900, 50),
    ]
    const absolute = [ap('a', 0, 50), ap('b', 300, 50), ap('c', 600, 50), ap('d', 900, 50)]
    const result = applyZigzag(makeInput(nodes, absolute), {
      staggerY: 100,
      xTolerance: 30,
      minColumns: 3,
    })

    // a and c stay, b and d shift down by 100.
    expect(result.nodes.find((n) => n.id === 'a')!.position.y).toBe(50)
    expect(result.nodes.find((n) => n.id === 'b')!.position.y).toBe(150)
    expect(result.nodes.find((n) => n.id === 'c')!.position.y).toBe(50)
    expect(result.nodes.find((n) => n.id === 'd')!.position.y).toBe(150)
    expect(result.absolutePositions.get('b')!.y).toBe(150)
    expect(result.absolutePositions.get('d')!.y).toBe(150)
  })

  it('grows totalHeight to fit the staggered nodes', () => {
    const nodes = [
      leaf('a', 0, 50),
      leaf('b', 300, 50),
      leaf('c', 600, 50),
    ]
    const absolute = [ap('a', 0, 50), ap('b', 300, 50), ap('c', 600, 50)]
    const result = applyZigzag(makeInput(nodes, absolute, 110), {
      staggerY: 100,
      xTolerance: 30,
      minColumns: 3,
    })
    // 'b' bottom is now at 150 + 60 = 210, so totalHeight grows past 110.
    expect(result.totalHeight).toBeGreaterThanOrEqual(210)
  })

  it('leaves layouts untouched when fewer than minColumns single-leaf columns exist', () => {
    const nodes = [leaf('a', 0, 50), leaf('b', 300, 50)]
    const absolute = [ap('a', 0, 50), ap('b', 300, 50)]
    const input = makeInput(nodes, absolute)
    const result = applyZigzag(input, { staggerY: 100, xTolerance: 30, minColumns: 3 })
    expect(result.nodes).toEqual(input.nodes)
    expect(result.absolutePositions).toBe(input.absolutePositions)
  })

  it('does not move group (compound) root nodes', () => {
    // Two singletons + a group: only 2 single-leaf columns, threshold not met.
    const nodes = [leaf('a', 0, 50), group('g', 300, 0), leaf('c', 600, 50)]
    const absolute = [ap('a', 0, 50), ap('g', 300, 0, 240, 200), ap('c', 600, 50)]
    const result = applyZigzag(makeInput(nodes, absolute), {
      staggerY: 100,
      xTolerance: 30,
      minColumns: 3,
    })
    // Group root is never staggered, threshold not met, nothing should move.
    expect(result.nodes.find((n) => n.id === 'g')!.position.y).toBe(0)
    expect(result.absolutePositions.get('g')!.y).toBe(0)
  })

  it('shifts descendants of a moved root along with the root', () => {
    // Three columns: leaf, group with child, leaf, leaf — 3 single-leaf
    // columns (a, c, d). The middle column is a group, which is skipped.
    const nodes = [
      leaf('a', 0, 50),
      group('g', 300, 0),
      child('g-child', 'g', 20, 40),
      leaf('c', 600, 50),
      leaf('d', 900, 50),
    ]
    const absolute = [
      ap('a', 0, 50),
      ap('g', 300, 0, 240, 200),
      ap('g-child', 320, 40),
      ap('c', 600, 50),
      ap('d', 900, 50),
    ]
    const result = applyZigzag(makeInput(nodes, absolute), {
      staggerY: 100,
      xTolerance: 30,
      minColumns: 3,
    })
    // a, c, d are single-leaf columns. Alternation: a stays, c shifts, d stays.
    expect(result.nodes.find((n) => n.id === 'a')!.position.y).toBe(50)
    expect(result.nodes.find((n) => n.id === 'c')!.position.y).toBe(150)
    expect(result.nodes.find((n) => n.id === 'd')!.position.y).toBe(50)
    // Group and its child should remain in place.
    expect(result.absolutePositions.get('g')!.y).toBe(0)
    expect(result.absolutePositions.get('g-child')!.y).toBe(40)
  })

  it('groups columns within the xTolerance', () => {
    // a and b sit within 20px of each other → same column → not staggered
    // because that column has 2 nodes; c and d are their own columns.
    const nodes = [
      leaf('a', 0, 0),
      leaf('b', 15, 100),
      leaf('c', 300, 50),
      leaf('d', 600, 50),
      leaf('e', 900, 50),
    ]
    const absolute = [
      ap('a', 0, 0),
      ap('b', 15, 100),
      ap('c', 300, 50),
      ap('d', 600, 50),
      ap('e', 900, 50),
    ]
    const result = applyZigzag(makeInput(nodes, absolute), {
      staggerY: 100,
      xTolerance: 30,
      minColumns: 3,
    })
    // a, b are clustered (column 0, 2 nodes) → untouched.
    // c, d, e are single-leaf columns → c stays, d shifts, e stays.
    expect(result.nodes.find((n) => n.id === 'a')!.position.y).toBe(0)
    expect(result.nodes.find((n) => n.id === 'b')!.position.y).toBe(100)
    expect(result.nodes.find((n) => n.id === 'c')!.position.y).toBe(50)
    expect(result.nodes.find((n) => n.id === 'd')!.position.y).toBe(150)
    expect(result.nodes.find((n) => n.id === 'e')!.position.y).toBe(50)
  })
})
