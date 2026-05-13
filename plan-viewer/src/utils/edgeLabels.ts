import type { EdgeDiffStatus } from '../types'

/**
 * Shared description of an architecture edge as seen by both ELK layout and
 * Svelte Flow routing. The two consumers must agree on label text and direction
 * so ELK can reserve the right amount of space.
 */
export interface EdgeForLabel {
  order: number
  source: string
  target: string
  label: string
  data: string
  status?: EdgeDiffStatus
}

/** Canonical key for an unordered pair {a, b}. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`
}

export interface EdgeGroup<E extends EdgeForLabel> {
  key: string
  /** All edges between this unordered pair, sorted by `order`. */
  edges: E[]
  /** The lowest-order edge in the group — its direction is the primary one. */
  primary: E
  /** Whether at least one edge points opposite to `primary`. */
  hasReverse: boolean
}

/** Group edges by unordered endpoint pair. Order within a group is by `order`. */
export function groupEdgesByPair<E extends EdgeForLabel>(edges: E[]): EdgeGroup<E>[] {
  const buckets = new Map<string, E[]>()
  for (const edge of edges) {
    const key = pairKey(edge.source, edge.target)
    const list = buckets.get(key) ?? []
    list.push(edge)
    buckets.set(key, list)
  }
  return Array.from(buckets.entries()).map(([key, list]) => {
    const sorted = [...list].sort((a, b) => a.order - b.order)
    const primary = sorted[0]
    const hasReverse = sorted.some(
      (e) => e.source === primary.target && e.target === primary.source
    )
    return { key, edges: sorted, primary, hasReverse }
  })
}

/**
 * Compose a label for a group of edges between the same pair. A single edge
 * keeps its plain label; multiple edges are joined with newlines and prefixed
 * with `→` / `←` so reverse-direction edges stay readable.
 */
export function composeGroupLabel<E extends EdgeForLabel>(group: EdgeGroup<E>): string {
  const { edges, primary } = group
  if (edges.length === 1) {
    const e = edges[0]
    return `${e.order}. ${e.label}${e.data ? ` / ${e.data}` : ''}`
  }
  return edges
    .map((e) => {
      const text = `${e.order}. ${e.label}${e.data ? ` / ${e.data}` : ''}`
      const reverse = e.source === primary.target && e.target === primary.source
      return `${reverse ? '← ' : '→ '}${text}`
    })
    .join('\n')
}

/**
 * Rough text-width estimate. Treats CJK / full-width code points as ~2x the
 * width of ASCII. Doesn't try to be exact — ELK uses this to bias spacing, so
 * we err generous to keep labels from overlapping edges and neighbour nodes.
 */
function estimateLineWidth(line: string, asciiCharWidth: number, wideCharWidth: number): number {
  let total = 0
  for (const ch of line) {
    const code = ch.codePointAt(0) ?? 0
    // Anything outside basic Latin / Latin-1 supplement is treated as wide.
    total += code > 0x00ff ? wideCharWidth : asciiCharWidth
  }
  return total
}

export interface LabelSize {
  width: number
  height: number
}

export interface MeasureOptions {
  /** Approx. width of an ASCII char at the rendered font size. */
  asciiCharWidth?: number
  /** Approx. width of a CJK / full-width char. */
  wideCharWidth?: number
  /** Vertical distance between baselines in px. */
  lineHeight?: number
  /** Padding added on each side of the label background. */
  paddingX?: number
  paddingY?: number
}

/**
 * Estimate the on-screen bounding box of a label string at the viewer's
 * default font size (11px sans-serif). The result is used both to tell ELK how
 * much room to reserve between layers and to keep label backgrounds wide
 * enough that they sit cleanly over edge lines.
 */
export function measureLabel(text: string, options: MeasureOptions = {}): LabelSize {
  const ascii = options.asciiCharWidth ?? 6.5
  const wide = options.wideCharWidth ?? 12
  const lineHeight = options.lineHeight ?? 16
  const padX = options.paddingX ?? 12
  const padY = options.paddingY ?? 8

  if (!text) return { width: padX * 2, height: lineHeight + padY * 2 }

  const lines = text.split('\n')
  const widest = lines.reduce(
    (max, line) => Math.max(max, estimateLineWidth(line, ascii, wide)),
    0
  )
  return {
    width: Math.ceil(widest + padX * 2),
    height: Math.ceil(lines.length * lineHeight + padY * 2),
  }
}
