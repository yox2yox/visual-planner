<script lang="ts">
  import { SvelteFlow, Background } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import type { Node, Edge } from '@xyflow/svelte'
  import type {
    DiagramOptions,
    EdgeRenderStyle,
    GlossaryItem,
    ArchitectureEdge,
    DiffEdge,
  } from '../types'
  import { computeDiffEdges } from '../utils/diff'
  import {
    filterGlossaryToArchitectureDiagram,
  } from '../utils/filter'
  import { findArchitectureTooltipItem } from '../utils/architectureTooltip'
  import { computeElkLayout, type ElkLayoutNode } from '../utils/elkLayout'
  import { routeEdges, toRoutedInput, type PositionedNode } from '../utils/edgeRouting'
  import { selectedGlossaryId } from '../stores'
  import ArchitectureGlossaryNode from './ArchitectureGlossaryNode.svelte'

  const MAX_DEPTH = 3

  interface Props {
    glossary: GlossaryItem[]
    architectureEdges: ArchitectureEdge[]
    diagram?: DiagramOptions
    isDiff?: boolean
    baseArchitectureEdges?: ArchitectureEdge[]
  }

  // Note: `diagram.nodePositions` and `diagram.edges.*Position` are no longer
  // honoured — ELK owns layout and `edgeRouting` picks handles from geometry.
  // The prop is still accepted for backward compatibility but ignored.
  const {
    glossary,
    architectureEdges,
    isDiff = false,
    baseArchitectureEdges = [],
  }: Props = $props()

  const NODE_W = 200
  const NODE_H = 60
  const GROUP_PAD_X = 20
  const GROUP_PAD_Y = 16
  const GROUP_HEADER = 28

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

  function makeLeafStyle(item: GlossaryItem, isSelected: boolean): string {
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

  function makeGroupStyle(
    item: GlossaryItem,
    width: number,
    height: number,
    isSelected: boolean
  ): string {
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

  function makeNodeData(item: GlossaryItem, isGroup: boolean) {
    const tooltipItem = findArchitectureTooltipItem(item.id, diagramGlossary)
    return {
      item: tooltipItem
        ? { ...tooltipItem, icon: tooltipItem.icon ?? defaultIcons[tooltipItem.type] ?? '' }
        : undefined,
      validIds: diagramValidIds,
      isGroup,
      tooltipVisible: activeTooltipId === item.id,
      onOpen: openTooltip,
      onClose: closeTooltip,
    }
  }

  function toSvelteFlowNode(layoutNode: ElkLayoutNode, selectedId: string | null): Node {
    const isSelected = selectedId === layoutNode.item.id
    return {
      id: layoutNode.id,
      position: layoutNode.position,
      type: 'architectureGlossary',
      data: makeNodeData(layoutNode.item, layoutNode.isGroup),
      style: layoutNode.isGroup
        ? makeGroupStyle(layoutNode.item, layoutNode.width, layoutNode.height, isSelected)
        : makeLeafStyle(layoutNode.item, isSelected),
      focusable: false,
      // Groups sit behind edges; leaves in front. See :global rule below.
      zIndex: activeTooltipId === layoutNode.id ? 20 : layoutNode.isGroup ? -1 : undefined,
      ...(layoutNode.parentId ? { parentId: layoutNode.parentId } : {}),
    }
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

  let selectedId = $state<string | null>(null)
  let activeTooltipId = $state<string | null>(null)

  $effect(() => {
    const unsubscribe = selectedGlossaryId.subscribe((v) => {
      selectedId = v
    })
    return unsubscribe
  })

  const diagramGlossary = $derived(filterGlossaryToArchitectureDiagram(glossary, architectureEdges))
  const diagramValidIds = $derived(new Set(diagramGlossary.map((item) => item.id)))

  const nodeTypes = { architectureGlossary: ArchitectureGlossaryNode }

  const diffEdges = $derived(
    isDiff ? computeDiffEdges(baseArchitectureEdges, architectureEdges) : null
  )

  let nodes = $state.raw<Node[]>([])
  let edges = $state.raw<Edge[]>([])
  let layoutNodes = $state.raw<ElkLayoutNode[]>([])
  let absolutePositions = $state.raw<Map<string, PositionedNode>>(new Map())
  let diagramHeight = $state(400)

  function openTooltip(id: string) {
    activeTooltipId = diagramValidIds.has(id) ? id : null
  }

  function closeTooltip() {
    activeTooltipId = null
  }

  $effect(() => {
    if (activeTooltipId && !diagramValidIds.has(activeTooltipId)) {
      activeTooltipId = null
    }
  })

  // Re-run ELK whenever the inputs change. The async result is committed back
  // to the reactive node/edge stores. A token guards against stale awaits when
  // the inputs change rapidly.
  let layoutToken = 0
  $effect(() => {
    const items = diagramGlossary
    const rawEdges = architectureEdges
    const token = ++layoutToken
    let cancelled = false

    computeElkLayout({
      glossary: items,
      edges: rawEdges,
      maxDepth: MAX_DEPTH,
      leafWidth: NODE_W,
      leafHeight: NODE_H,
      groupHeader: GROUP_HEADER,
      groupPaddingX: GROUP_PAD_X,
      groupPaddingY: GROUP_PAD_Y,
    })
      .then((result) => {
        if (cancelled || token !== layoutToken) return
        layoutNodes = result.nodes
        absolutePositions = result.absolutePositions
        diagramHeight = Math.max(result.totalHeight + 80, 300)
      })
      .catch((err) => {
        console.error('ELK layout failed:', err)
      })

    return () => {
      cancelled = true
    }
  })

  // Map ELK nodes → Svelte Flow nodes when either layout or selection changes.
  $effect(() => {
    nodes = layoutNodes.map((ln) => toSvelteFlowNode(ln, selectedId))
  })

  // Compose routed edges from architecture/diff inputs + positions.
  $effect(() => {
    if (absolutePositions.size === 0) {
      edges = []
      return
    }

    const inputs = diffEdges
      ? diffEdges.map((e) => {
          const raw = architectureEdges.find((edge) => edge.order === e.order)
          const composedStyle = `${edgeStyle(e.status)} ${renderStyle(raw?.edgeStyle)}`.trim()
          return toRoutedInput(e, composedStyle, {
            animated: raw?.animated ?? e.status === 'added',
            type: raw?.edgeType,
          })
        })
      : architectureEdges.map((e) =>
          toRoutedInput(e, renderStyle(e.edgeStyle), {
            animated: e.animated,
            type: e.edgeType,
          })
        )

    const routed = routeEdges(absolutePositions, inputs)
    edges = routed.map((r) => ({
      id: r.id,
      source: r.source,
      target: r.target,
      sourceHandle: r.sourceHandle,
      targetHandle: r.targetHandle,
      label: r.label,
      animated: r.animated,
      type: r.type ?? 'smoothstep',
      style: r.style,
      markerEnd: r.markerEnd,
      markerStart: r.markerStart,
      // Multi-line labels are produced for merged edges; keep them readable.
      labelStyle: r.merged ? 'white-space: pre; font-size: 11px;' : 'font-size: 11px;',
      labelBgPadding: [6, 4],
      labelBgBorderRadius: 4,
      labelBgStyle: 'fill: white; fill-opacity: 0.9;',
    }))
  })
</script>

<div style="height: {diagramHeight}px;" class="w-full border border-gray-200 rounded-lg overflow-hidden">
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    fitView
    elevateNodesOnSelect={false}
    onnodeclick={({ node }) => openTooltip(node.id)}
  >
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
