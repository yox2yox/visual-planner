<script lang="ts">
  import { SvelteFlow, Background, Position } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import type { Node, Edge } from '@xyflow/svelte'
  import type {
    DiagramEdgeOptions,
    DiagramOptions,
    EdgeRenderStyle,
    GlossaryItem,
    ArchitectureEdge,
    DiffEdge,
    NodePortPosition,
  } from '../types'
  import { computeDiffEdges } from '../utils/diff'
  import {
    buildTree,
    filterGlossaryToArchitectureDiagram,
    flattenTree,
    type TreeNode,
  } from '../utils/filter'
  import { selectedGlossaryId } from '../stores'

  const MAX_DEPTH = 3

  interface Props {
    glossary: GlossaryItem[]
    architectureEdges: ArchitectureEdge[]
    diagram?: DiagramOptions
    isDiff?: boolean
    baseArchitectureEdges?: ArchitectureEdge[]
  }

  const {
    glossary,
    architectureEdges,
    diagram,
    isDiff = false,
    baseArchitectureEdges = [],
  }: Props = $props()

  const NODE_W = 180
  const NODE_H = 60
  const GAP_X = 40
  const GAP_Y = 40
  const GROUP_PAD_X = 20
  const GROUP_PAD_Y = 40
  const GROUP_GAP = 60
  const GROUP_HEADER = 30
  const COLS_IN_GROUP = 3
  const POSITION_MAP: Record<NodePortPosition, Position> = {
    top: Position.Top,
    right: Position.Right,
    bottom: Position.Bottom,
    left: Position.Left,
  }

  const typeColors: Record<string, string> = {
    term: '#ede9fe',
    client: '#e0f2fe',
    server: '#dbeafe',
    'cloud-service': '#cffafe',
    class: '#fef3c7',
    function: '#ffedd5',
    db: '#d1fae5',
    table: '#ccfbf1',
  }
  const typeBorderColors: Record<string, string> = {
    term: '#7c3aed',
    client: '#0284c7',
    server: '#2563eb',
    'cloud-service': '#0891b2',
    class: '#d97706',
    function: '#ea580c',
    db: '#059669',
    table: '#0d9488',
  }
  const groupBgColors: Record<string, string> = {
    term: '#f5f3ff',
    client: '#f0f9ff',
    server: '#eff6ff',
    'cloud-service': '#ecfeff',
    class: '#fffbeb',
    function: '#fff7ed',
    db: '#ecfdf5',
    table: '#f0fdfa',
  }
  const defaultIcons: Record<string, string> = {
    term: '📖',
    client: '💻',
    server: '🖥️',
    'cloud-service': '☁️',
    class: '📦',
    function: 'ƒ',
    db: '🗄️',
    table: '▦',
  }

  function makeNodeStyle(item: GlossaryItem, isSelected: boolean): string {
    return [
      `background: ${typeColors[item.type] ?? '#f3f4f6'};`,
      `border: 2px solid ${typeBorderColors[item.type] ?? '#6b7280'};`,
      'border-radius: 8px;',
      'padding: 8px 12px;',
      'font-size: 13px;',
      'font-weight: 600;',
      `min-width: ${NODE_W}px;`,
      isSelected ? 'box-shadow: 0 0 0 3px #3b82f6;' : '',
    ].join(' ')
  }

  function makeNodeLabel(item: GlossaryItem): string {
    return `${item.icon ?? defaultIcons[item.type] ?? ''} ${item.name}`
  }

  interface LayoutResult {
    nodes: Node[]
    totalHeight: number
    tree: TreeNode[]
  }

  function edgeKey(edge: Pick<ArchitectureEdge, 'order' | 'source' | 'target'>): string {
    return `${edge.source}->${edge.target}`
  }

  function getDiagramEdgeOptions(edge: Pick<ArchitectureEdge, 'order' | 'source' | 'target'>): DiagramEdgeOptions {
    return diagram?.edges?.[String(edge.order)] ?? diagram?.edges?.[edgeKey(edge)] ?? {}
  }

  function nodeSourcePosition(id: string): Position {
    const edge = architectureEdges.find((edge) => edge.source === id)
    const configured = edge
      ? edge.sourcePosition ?? getDiagramEdgeOptions(edge).sourcePosition
      : undefined
    return configured ? POSITION_MAP[configured] : Position.Right
  }

  function nodeTargetPosition(id: string): Position {
    const edge = architectureEdges.find((edge) => edge.target === id)
    const configured = edge
      ? edge.targetPosition ?? getDiagramEdgeOptions(edge).targetPosition
      : undefined
    return configured ? POSITION_MAP[configured] : Position.Left
  }

  function makeArchitectureNode(
    item: GlossaryItem,
    position: { x: number; y: number },
    isSelected: boolean,
    parentId?: string
  ): Node {
    return {
      id: item.id,
      position,
      data: { label: makeNodeLabel(item) },
      sourcePosition: nodeSourcePosition(item.id),
      targetPosition: nodeTargetPosition(item.id),
      style: makeNodeStyle(item, isSelected),
      ...(parentId ? { parentId } : {}),
    }
  }

  function buildManualLayout(items: GlossaryItem[], selectedId: string | null): LayoutResult {
    const nodes: Node[] = []
    const tree = buildTree(items, MAX_DEPTH)
    let maxY = 0

    items.forEach((item, i) => {
      const configured = diagram?.nodePositions?.[item.id]
      const col = i % COLS_IN_GROUP
      const row = Math.floor(i / COLS_IN_GROUP)
      const position = configured ?? {
        x: col * (NODE_W + GAP_X),
        y: row * (NODE_H + GAP_Y),
      }

      maxY = Math.max(maxY, position.y + NODE_H)
      nodes.push(makeArchitectureNode(item, position, selectedId === item.id))
    })

    return { nodes, totalHeight: maxY, tree }
  }

  function groupNodeStyle(item: GlossaryItem, width: number, height: number, isSelected: boolean): string {
    return [
      `background: ${groupBgColors[item.type] ?? '#f9fafb'};`,
      `border: 2px dashed ${typeBorderColors[item.type] ?? '#9ca3af'};`,
      'border-radius: 12px;',
      'padding: 12px 16px;',
      'font-size: 14px;',
      'font-weight: 700;',
      `width: ${width}px;`,
      `height: ${height}px;`,
      isSelected ? 'box-shadow: 0 0 0 3px #3b82f6;' : '',
    ].join(' ')
  }

  function buildHierarchicalLayout(items: GlossaryItem[], selectedId: string | null): LayoutResult {
    const tree = buildTree(items, MAX_DEPTH)
    const nodes: Node[] = []

    // Lay out a subtree rooted at `treeNode`. Returns the outer box size.
    // The parent node is pushed with its own position (relative to its parent, or
    // absolute for roots); children are pushed AFTER the parent with positions
    // relative to `treeNode` itself so Svelte Flow's parentId system computes
    // their absolute positions correctly.
    function layoutSubtree(treeNode: TreeNode, position: { x: number; y: number }, parentId?: string): { width: number; height: number } {
      const children = treeNode.children
      const isLeaf = children.length === 0
      const isSelected = selectedId === treeNode.item.id

      if (isLeaf) {
        nodes.push(makeArchitectureNode(treeNode.item, position, isSelected, parentId))
        return { width: NODE_W, height: NODE_H }
      }

      // Push parent first so it appears before its children in the nodes array
      // (required by Svelte Flow). Style/size is finalized after children are laid out.
      // zIndex: -1 keeps the solid-background group behind the edge layer so that
      // edges crossing the group rectangle stay visible. Combined with
      // elevateNodesOnSelect={false} on <SvelteFlow>, the group stays below edges
      // even when selected or dragged.
      const groupNodeIndex = nodes.length
      nodes.push({
        id: treeNode.item.id,
        position,
        data: { label: makeNodeLabel(treeNode.item) },
        sourcePosition: nodeSourcePosition(treeNode.item.id),
        targetPosition: nodeTargetPosition(treeNode.item.id),
        style: '',
        zIndex: -1,
        ...(parentId ? { parentId } : {}),
      })

      const leafChildren = children.filter((c) => c.children.length === 0)
      const groupChildren = children.filter((c) => c.children.length > 0)

      let innerY = GROUP_HEADER + GROUP_PAD_Y

      // Leaf children: laid out in a grid, positions relative to this group
      for (let i = 0; i < leafChildren.length; i++) {
        const col = i % COLS_IN_GROUP
        const row = Math.floor(i / COLS_IN_GROUP)
        layoutSubtree(
          leafChildren[i],
          {
            x: GROUP_PAD_X + col * (NODE_W + GAP_X),
            y: innerY + row * (NODE_H + GAP_Y),
          },
          treeNode.item.id
        )
      }

      const leafCols = Math.min(leafChildren.length, COLS_IN_GROUP)
      const leafRows = Math.ceil(leafChildren.length / COLS_IN_GROUP)
      const leafBlockHeight = leafRows > 0 ? leafRows * (NODE_H + GAP_Y) : 0
      let subGroupY = innerY + leafBlockHeight

      // Sub-groups: stacked vertically below leaves, positions relative to this group
      let maxSubGroupWidth = 0
      for (const subGroup of groupChildren) {
        const sub = layoutSubtree(
          subGroup,
          { x: GROUP_PAD_X, y: subGroupY },
          treeNode.item.id
        )
        subGroupY += sub.height + GAP_Y
        maxSubGroupWidth = Math.max(maxSubGroupWidth, sub.width)
      }

      const contentWidth = Math.max(
        leafCols * (NODE_W + GAP_X) - GAP_X,
        maxSubGroupWidth,
        NODE_W
      )
      const groupWidth = contentWidth + GROUP_PAD_X * 2
      const groupHeight = subGroupY + GROUP_PAD_Y

      nodes[groupNodeIndex] = {
        ...nodes[groupNodeIndex],
        style: groupNodeStyle(treeNode.item, groupWidth, groupHeight, isSelected),
      }

      return { width: groupWidth, height: groupHeight }
    }

    const rootLeaves = tree.filter((n) => n.children.length === 0)
    const rootGroups = tree.filter((n) => n.children.length > 0)

    let yOffset = 0

    // Root groups — absolute coordinates, stacked vertically
    for (const group of rootGroups) {
      const result = layoutSubtree(group, { x: 0, y: yOffset })
      yOffset += result.height + GROUP_GAP
    }

    // Root leaves — absolute coordinates, grid below groups
    for (let i = 0; i < rootLeaves.length; i++) {
      const col = i % COLS_IN_GROUP
      const row = Math.floor(i / COLS_IN_GROUP)
      layoutSubtree(rootLeaves[i], {
        x: col * (NODE_W + GAP_X),
        y: yOffset + row * (NODE_H + GAP_Y),
      })
    }
    if (rootLeaves.length > 0) {
      const leafRows = Math.ceil(rootLeaves.length / COLS_IN_GROUP)
      yOffset += leafRows * (NODE_H + GAP_Y)
    }

    return { nodes, totalHeight: yOffset, tree }
  }

  function buildLayout(items: GlossaryItem[], selectedId: string | null): LayoutResult {
    if (diagram?.nodePositions && Object.keys(diagram.nodePositions).length > 0) {
      return buildManualLayout(items, selectedId)
    }
    return buildHierarchicalLayout(items, selectedId)
  }

  function edgeStyle(status: DiffEdge['status']): string {
    switch (status) {
      case 'added':
        return 'stroke: #16a34a; stroke-width: 3;'
      case 'changed':
        return 'stroke: #ca8a04; stroke-width: 3;'
      case 'removed':
        return 'stroke: #dc2626; stroke-width: 2; stroke-dasharray: 6,3;'
      default:
        return ''
    }
  }

  function renderStyle(style: EdgeRenderStyle | undefined): string {
    switch (style) {
      case 'bold':
        return 'stroke-width: 3;'
      case 'dashed':
        return 'stroke-dasharray: 8,4;'
      case 'dotted':
        return 'stroke-dasharray: 2,4;'
      default:
        return ''
    }
  }

  function buildEdges(
    validIds: Set<string>,
    rawArchitectureEdges: ArchitectureEdge[],
    diffEdges: DiffEdge[] | null
  ): Edge[] {
    const ids = validIds

    if (diffEdges) {
      return diffEdges
        .filter((e) => {
          const valid = ids.has(e.source) && ids.has(e.target)
          if (!valid)
            console.warn(`Skipping architecture edge: unknown glossary id (${e.source} -> ${e.target})`)
          return valid
        })
        .map((e) => {
          const raw = rawArchitectureEdges.find((edge) => edge.order === e.order)
          const options = getDiagramEdgeOptions(e)
          return {
          id: `${e.order}-${e.source}-${e.target}-${e.status}`,
          source: e.source,
          target: e.target,
          label: `${e.order}. ${e.label} / ${e.data}`,
          animated: raw?.animated ?? options.animated ?? e.status === 'added',
          type: raw?.edgeType ?? options.type,
          style: `${edgeStyle(e.status)} ${renderStyle(raw?.edgeStyle ?? options.style)}`,
        }})
    }

    return rawArchitectureEdges
      .filter((edge) => {
        const valid = ids.has(edge.source) && ids.has(edge.target)
        if (!valid)
          console.warn(
            `Skipping architecture edge: unknown glossary id (${edge.source} -> ${edge.target})`
          )
        return valid
      })
      .map((edge) => ({
        id: `${edge.order}-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        label: `${edge.order}. ${edge.label} / ${edge.data}`,
        animated: edge.animated ?? getDiagramEdgeOptions(edge).animated,
        type: edge.edgeType ?? getDiagramEdgeOptions(edge).type,
        style: renderStyle(edge.edgeStyle ?? getDiagramEdgeOptions(edge).style),
      }))
  }

  let selectedId = $state<string | null>(null)

  $effect(() => {
    const unsubscribe = selectedGlossaryId.subscribe((v) => {
      selectedId = v
    })
    return unsubscribe
  })

  const diagramGlossary = $derived(filterGlossaryToArchitectureDiagram(glossary, architectureEdges))

  const diffEdges = $derived(
    isDiff ? computeDiffEdges(baseArchitectureEdges, architectureEdges) : null
  )

  let nodes = $state.raw<Node[]>([])
  let edges = $state.raw<Edge[]>([])

  let layout = $derived(buildLayout(diagramGlossary, selectedId))

  const validIds = $derived(
    new Set(flattenTree(layout.tree).map((n) => n.item.id))
  )

  $effect(() => {
    nodes = layout.nodes
  })

  $effect(() => {
    edges = buildEdges(validIds, architectureEdges, diffEdges)
  })

  const diagramHeight = $derived(
    Math.max(layout.totalHeight + 100, 300)
  )
</script>

<div style="height: {diagramHeight}px;" class="w-full border border-gray-200 rounded-lg overflow-hidden">
  <SvelteFlow bind:nodes bind:edges fitView elevateNodesOnSelect={false}>
    <Background />
  </SvelteFlow>
</div>

<style>
  /* Break the stacking context that Svelte Flow sets on .svelte-flow__nodes
     (style.css sets z-index: 0). Without this, individual nodes with negative
     zIndex cannot render behind the edges layer; group nodes would always
     cover the edges crossing them. */
  :global(.svelte-flow__nodes) {
    z-index: auto !important;
  }
</style>
