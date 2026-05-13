import type { ElkLayoutNode } from './elkLayout'
import type { PositionedNode } from './edgeRouting'

export interface ZigzagInput {
  nodes: ElkLayoutNode[]
  absolutePositions: Map<string, PositionedNode>
  totalHeight: number
}

export interface ZigzagOptions {
  /** Vertical offset applied to alternating single-leaf columns, in px. */
  staggerY: number
  /** X-tolerance in px when grouping root nodes into columns. */
  xTolerance: number
  /** Minimum number of single-leaf columns required before zigzag activates. */
  minColumns: number
}

export const DEFAULT_ZIGZAG_OPTIONS: ZigzagOptions = {
  staggerY: 120,
  xTolerance: 30,
  minColumns: 3,
}

interface Column {
  /** Column index in left-to-right order. */
  idx: number
  nodes: ElkLayoutNode[]
}

/**
 * After ELK lays the graph out left-to-right, a chain of leaf nodes lands in a
 * single horizontal row. The label chip on each smoothstep edge then sits
 * exactly on the horizontal stroke between two nodes, so the line passes
 * through the description text.
 *
 * `applyZigzag` post-processes the layout: it groups root nodes by their X
 * coordinate, finds columns that hold a single leaf node, and pushes every
 * other such column down by `staggerY`. The edges then bend vertically between
 * neighbours and the labels sit in the bend instead of on a straight line.
 *
 * Groups (compound nodes) are never moved — they already span vertically and
 * ELK has placed their children relative to them. Columns with multiple root
 * nodes are also left alone, since ELK is already distributing them
 * vertically.
 */
export function applyZigzag(
  input: ZigzagInput,
  options: ZigzagOptions = DEFAULT_ZIGZAG_OPTIONS
): ZigzagInput {
  const { nodes, absolutePositions, totalHeight } = input
  const { staggerY, xTolerance, minColumns } = options

  const roots = nodes.filter((n) => !n.parentId)
  if (roots.length < minColumns) return input

  const columns = groupRootsByColumn(roots, xTolerance)
  const single = columns.filter((c) => c.nodes.length === 1 && !c.nodes[0].isGroup)
  if (single.length < minColumns) return input

  // Offset every other single-leaf column. Use the position in the
  // single-leaf list (not the absolute column index) so the alternation reads
  // visually even when multi-node columns sit between single columns.
  const offsets = new Map<string, number>()
  single.forEach((column, i) => {
    if (i % 2 === 1) offsets.set(column.nodes[0].id, staggerY)
  })
  if (offsets.size === 0) return input

  const childrenOf = buildChildrenMap(nodes)

  const newNodes = nodes.map((n) => {
    if (n.parentId) return n
    const dy = offsets.get(n.id) ?? 0
    if (!dy) return n
    return { ...n, position: { x: n.position.x, y: n.position.y + dy } }
  })

  const newAbsolute = new Map(absolutePositions)
  for (const [rootId, dy] of offsets) {
    if (!dy) continue
    for (const id of collectSubtreeIds(rootId, childrenOf)) {
      const ap = newAbsolute.get(id)
      if (ap) newAbsolute.set(id, { ...ap, y: ap.y + dy })
    }
  }

  let newTotalHeight = totalHeight
  for (const ap of newAbsolute.values()) {
    newTotalHeight = Math.max(newTotalHeight, ap.y + ap.height)
  }

  return {
    nodes: newNodes,
    absolutePositions: newAbsolute,
    totalHeight: newTotalHeight,
  }
}

function groupRootsByColumn(roots: ElkLayoutNode[], xTolerance: number): Column[] {
  const sorted = [...roots].sort((a, b) => a.position.x - b.position.x)
  const columns: Column[] = []
  for (const root of sorted) {
    const last = columns[columns.length - 1]
    if (last && Math.abs(last.nodes[0].position.x - root.position.x) <= xTolerance) {
      last.nodes.push(root)
    } else {
      columns.push({ idx: columns.length, nodes: [root] })
    }
  }
  return columns
}

function buildChildrenMap(nodes: ElkLayoutNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const n of nodes) {
    if (!n.parentId) continue
    const list = map.get(n.parentId) ?? []
    list.push(n.id)
    map.set(n.parentId, list)
  }
  return map
}

function collectSubtreeIds(rootId: string, childrenOf: Map<string, string[]>): string[] {
  const ids = [rootId]
  const queue = [rootId]
  while (queue.length) {
    const cur = queue.shift()!
    for (const child of childrenOf.get(cur) ?? []) {
      ids.push(child)
      queue.push(child)
    }
  }
  return ids
}
