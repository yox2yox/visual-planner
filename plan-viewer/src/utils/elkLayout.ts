import ELK from 'elkjs/lib/elk.bundled.js'
import type { ElkExtendedEdge, ElkLabel, ElkNode } from 'elkjs/lib/elk-api'
import type { ArchitectureEdge, GlossaryItem } from '../types'
import { composeGroupLabel, groupEdgesByPair, measureLabel } from './edgeLabels'
import type { PositionedNode } from './edgeRouting'
import { buildTree, type TreeNode } from './filter'

const elk = new ELK()

export interface ElkLayoutInput {
  glossary: GlossaryItem[]
  /**
   * Architecture edges as they appear on the plan. ELK is given one edge per
   * unordered pair (matching how the renderer merges them) with the merged
   * label attached so layered layout can reserve room between layers.
   */
  edges: Pick<ArchitectureEdge, 'order' | 'source' | 'target' | 'label' | 'data'>[]
  maxDepth: number
  leafWidth: number
  leafHeight: number
  groupHeader: number
  groupPaddingX: number
  groupPaddingY: number
}

export interface ElkLayoutNode {
  id: string
  /** Position relative to parent (or absolute for roots) — Svelte Flow style. */
  position: { x: number; y: number }
  width: number
  height: number
  parentId?: string
  isGroup: boolean
  /** Original glossary item, preserved for caller. */
  item: GlossaryItem
}

export interface ElkLayoutResult {
  nodes: ElkLayoutNode[]
  /** Absolute positions keyed by node id — used by edge routing. */
  absolutePositions: Map<string, PositionedNode>
  /** The same tree the caller may want to keep for downstream consumers. */
  tree: TreeNode[]
  totalWidth: number
  totalHeight: number
}

/**
 * Convert a glossary tree + edge list into an ELK compound graph and run the
 * `layered` algorithm. The result is mapped back into a flat list of nodes
 * suitable for Svelte Flow, preserving the `parentId` hierarchy.
 *
 * ELK is fully async, so callers must await this. It's safe to call repeatedly;
 * a single ELK instance is reused module-wide.
 */
export async function computeElkLayout(input: ElkLayoutInput): Promise<ElkLayoutResult> {
  const tree = buildTree(input.glossary, input.maxDepth)

  // Map id -> ELK node so we can resolve parents quickly later.
  const elkNodeById = new Map<string, ElkNode>()
  const itemById = new Map<string, GlossaryItem>()

  function toElkNode(node: TreeNode): ElkNode {
    itemById.set(node.item.id, node.item)
    const isLeaf = node.children.length === 0
    if (isLeaf) {
      const elkNode: ElkNode = {
        id: node.item.id,
        width: input.leafWidth,
        height: input.leafHeight,
      }
      elkNodeById.set(node.item.id, elkNode)
      return elkNode
    }

    const children = node.children.map(toElkNode)
    // Compound node — ELK will size it from children + padding.
    const padTop = input.groupHeader + input.groupPaddingY
    const padBottom = input.groupPaddingY
    const padX = input.groupPaddingX
    const elkNode: ElkNode = {
      id: node.item.id,
      children,
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.padding': `[top=${padTop},left=${padX},bottom=${padBottom},right=${padX}]`,
        // Generous spacing inside groups too — labels on merged edges can be
        // multi-line so they need horizontal room.
        'elk.layered.spacing.nodeNodeBetweenLayers': '160',
        'elk.spacing.nodeNode': '70',
        'elk.spacing.edgeNode': '50',
        'elk.spacing.edgeEdge': '25',
        // Match the root graph: keep description text off edge lines.
        'elk.edgeLabels.inline': 'false',
        'elk.layered.edgeLabels.sideSelection': 'SMART_DOWN',
        'elk.spacing.edgeLabel': '14',
      },
    }
    elkNodeById.set(node.item.id, elkNode)
    return elkNode
  }

  const rootElkChildren = tree.map(toElkNode)

  // Edges are declared at the top level. With INCLUDE_CHILDREN the layered
  // algorithm reasons across the hierarchy and routes them to minimise
  // crossings.
  //
  // We pre-merge edges by unordered pair the same way the renderer does, so
  // ELK sees the actual labels that will be drawn and can reserve room
  // between layers for them. Each ELK edge carries its measured label as an
  // ElkLabel — combined with `edgeLabels.inline: false` below, layered layout
  // pushes labels off the edge line into the gap between layers.
  const validIds = new Set(elkNodeById.keys())
  const reachable = input.edges.filter(
    (edge) => validIds.has(edge.source) && validIds.has(edge.target)
  )
  const groups = groupEdgesByPair(reachable)
  const elkEdges: ElkExtendedEdge[] = groups.map((group, i) => {
    const text = composeGroupLabel(group)
    const size = measureLabel(text)
    const label: ElkLabel = {
      text,
      width: size.width,
      height: size.height,
    }
    return {
      id: `e${i}`,
      sources: [group.primary.source],
      targets: [group.primary.target],
      labels: [label],
    }
  })

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      // Horizontal gap between layers — labels live between layers, so we
      // want generous baseline room here on top of label-driven spacing.
      'elk.layered.spacing.nodeNodeBetweenLayers': '220',
      // Vertical gap between nodes in the same layer.
      'elk.spacing.nodeNode': '90',
      // Keep edges away from neighbour nodes and from each other so parallel
      // edges between the same two layers don't pile up.
      'elk.spacing.edgeNode': '60',
      'elk.spacing.edgeEdge': '30',
      'elk.layered.spacing.edgeNodeBetweenLayers': '60',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '30',
      // Move labels off the edge line and place them just below — keeps the
      // line visible and stops description text from sitting on the stroke.
      'elk.edgeLabels.inline': 'false',
      'elk.layered.edgeLabels.sideSelection': 'SMART_DOWN',
      // Padding between a label and the edge / neighbour nodes. Combined with
      // the per-label width/height supplied above, this drives layer spacing
      // so multi-line merged labels don't overlap nodes.
      'elk.spacing.edgeLabel': '14',
      'elk.layered.crossingMinimization.semiInteractive': 'true',
    },
    children: rootElkChildren,
    edges: elkEdges,
  }

  const laid = await elk.layout(graph)

  // Walk the laid-out graph and produce flat node list + absolute positions.
  const nodes: ElkLayoutNode[] = []
  const absolutePositions = new Map<string, PositionedNode>()

  function walk(elkNode: ElkNode, parentId: string | undefined, parentAbsX: number, parentAbsY: number) {
    const x = elkNode.x ?? 0
    const y = elkNode.y ?? 0
    const width = elkNode.width ?? input.leafWidth
    const height = elkNode.height ?? input.leafHeight
    const absX = parentAbsX + x
    const absY = parentAbsY + y

    const item = itemById.get(elkNode.id)
    if (item) {
      const isGroup = !!elkNode.children && elkNode.children.length > 0
      nodes.push({
        id: elkNode.id,
        position: { x, y },
        width,
        height,
        parentId,
        isGroup,
        item,
      })
      absolutePositions.set(elkNode.id, {
        id: elkNode.id,
        x: absX,
        y: absY,
        width,
        height,
      })
    }

    if (elkNode.children) {
      for (const child of elkNode.children) {
        walk(child, elkNode.id, absX, absY)
      }
    }
  }

  for (const root of laid.children ?? []) {
    walk(root, undefined, 0, 0)
  }

  return {
    nodes,
    absolutePositions,
    tree,
    totalWidth: laid.width ?? 0,
    totalHeight: laid.height ?? 0,
  }
}
