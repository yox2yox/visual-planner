<script lang="ts">
  import { writable } from 'svelte/store'
  import { SvelteFlow, Background } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import type { Node, Edge } from '@xyflow/svelte'
  import type { GlossaryItem, Interaction, DiffEdge } from '../types'
  import { computeDiffEdges } from '../utils/diff'
  import { buildTree, type TreeNode } from '../utils/filter'
  import { selectedGlossaryId } from '../stores'

  interface Props {
    glossary: GlossaryItem[]
    interactions: Interaction[]
    isDiff?: boolean
    baseInteractions?: Interaction[]
  }

  const { glossary, interactions, isDiff = false, baseInteractions = [] }: Props = $props()

  const NODE_W = 180
  const NODE_H = 60
  const GAP_X = 40
  const GAP_Y = 40
  const GROUP_PAD_X = 20
  const GROUP_PAD_Y = 40
  const GROUP_GAP = 60
  const GROUP_HEADER = 30
  const COLS_IN_GROUP = 3

  const typeColors: Record<string, string> = {
    term: '#ede9fe',
    feature: '#dbeafe',
    data: '#dcfce7',
  }
  const typeBorderColors: Record<string, string> = {
    term: '#7c3aed',
    feature: '#2563eb',
    data: '#16a34a',
  }
  const groupBgColors: Record<string, string> = {
    term: '#f5f3ff',
    feature: '#eff6ff',
    data: '#f0fdf4',
  }
  const defaultIcons: Record<string, string> = {
    term: '📖',
    feature: '⚡',
    data: '💾',
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
  }

  function buildHierarchicalLayout(items: GlossaryItem[], selectedId: string | null): LayoutResult {
    const tree = buildTree(items)
    const nodes: Node[] = []
    let currentY = 0

    function layoutGroup(treeNode: TreeNode, offsetX: number, offsetY: number): { width: number; height: number } {
      const children = treeNode.children
      const leafChildren = children.filter((c) => c.children.length === 0)
      const groupChildren = children.filter((c) => c.children.length > 0)

      if (children.length === 0) {
        // Leaf node — push it as a regular node
        nodes.push({
          id: treeNode.item.id,
          position: { x: offsetX, y: offsetY },
          data: { label: makeNodeLabel(treeNode.item) },
          style: makeNodeStyle(treeNode.item, selectedId === treeNode.item.id),
        })
        return { width: NODE_W, height: NODE_H }
      }

      // This node has children — push group background placeholder first (z-order: behind children)
      const groupNodeIndex = nodes.length
      nodes.push({
        id: treeNode.item.id,
        position: { x: offsetX, y: offsetY },
        data: { label: makeNodeLabel(treeNode.item) },
        style: '', // will be updated after size is computed
      })

      let innerY = GROUP_HEADER + GROUP_PAD_Y

      // Layout leaf children in grid inside this group
      for (let i = 0; i < leafChildren.length; i++) {
        const col = i % COLS_IN_GROUP
        const row = Math.floor(i / COLS_IN_GROUP)
        const child = leafChildren[i]
        nodes.push({
          id: child.item.id,
          position: {
            x: offsetX + GROUP_PAD_X + col * (NODE_W + GAP_X),
            y: offsetY + innerY + row * (NODE_H + GAP_Y),
          },
          data: { label: makeNodeLabel(child.item) },
          style: makeNodeStyle(child.item, selectedId === child.item.id),
        })
      }

      const leafCols = Math.min(leafChildren.length, COLS_IN_GROUP)
      const leafRows = Math.ceil(leafChildren.length / COLS_IN_GROUP)
      const leafBlockHeight = leafRows > 0 ? leafRows * (NODE_H + GAP_Y) : 0
      let subGroupY = innerY + leafBlockHeight

      // Layout sub-groups below leaf children
      let maxSubGroupWidth = 0
      for (const subGroup of groupChildren) {
        const sub = layoutGroup(subGroup, offsetX + GROUP_PAD_X, offsetY + subGroupY)
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

      // Update group background node with computed size
      nodes[groupNodeIndex] = {
        id: treeNode.item.id,
        position: { x: offsetX, y: offsetY },
        data: { label: makeNodeLabel(treeNode.item) },
        style: [
          `background: ${groupBgColors[treeNode.item.type] ?? '#f9fafb'};`,
          `border: 2px dashed ${typeBorderColors[treeNode.item.type] ?? '#9ca3af'};`,
          'border-radius: 12px;',
          'padding: 12px 16px;',
          'font-size: 14px;',
          'font-weight: 700;',
          `width: ${groupWidth}px;`,
          `height: ${groupHeight}px;`,
          selectedId === treeNode.item.id ? 'box-shadow: 0 0 0 3px #3b82f6;' : '',
        ].join(' '),
      }

      return { width: groupWidth, height: groupHeight }
    }

    // Layout root-level nodes
    const rootLeaves = tree.filter((n) => n.children.length === 0)
    const rootGroups = tree.filter((n) => n.children.length > 0)

    // Place root groups vertically
    let yOffset = 0
    for (const group of rootGroups) {
      const result = layoutGroup(group, 0, yOffset)
      yOffset += result.height + GROUP_GAP
    }

    // Place root leaf nodes below groups in a grid
    if (rootLeaves.length > 0) {
      for (let i = 0; i < rootLeaves.length; i++) {
        const col = i % COLS_IN_GROUP
        const row = Math.floor(i / COLS_IN_GROUP)
        const leaf = rootLeaves[i]
        nodes.push({
          id: leaf.item.id,
          position: {
            x: col * (NODE_W + GAP_X),
            y: yOffset + row * (NODE_H + GAP_Y),
          },
          data: { label: makeNodeLabel(leaf.item) },
          style: makeNodeStyle(leaf.item, selectedId === leaf.item.id),
        })
      }
      const leafRows = Math.ceil(rootLeaves.length / COLS_IN_GROUP)
      yOffset += leafRows * (NODE_H + GAP_Y)
    }

    return { nodes, totalHeight: yOffset }
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

  function buildEdges(
    items: GlossaryItem[],
    rawInteractions: Interaction[],
    diffEdges: DiffEdge[] | null
  ): Edge[] {
    const ids = new Set(items.map((i) => i.id))

    if (diffEdges) {
      return diffEdges
        .filter((e) => {
          const valid = ids.has(e.source) && ids.has(e.target)
          if (!valid)
            console.warn(`Skipping edge: unknown glossary id (${e.source} → ${e.target})`)
          return valid
        })
        .map((e) => ({
          id: `${e.source}-${e.target}-${e.status}`,
          source: e.source,
          target: e.target,
          label: `${e.label} / ${e.data}`,
          animated: e.status === 'added',
          style: edgeStyle(e.status),
        }))
    }

    return rawInteractions
      .filter((interaction) => {
        const valid = ids.has(interaction.source) && ids.has(interaction.target)
        if (!valid)
          console.warn(
            `Skipping edge: unknown glossary id (${interaction.source} → ${interaction.target})`
          )
        return valid
      })
      .map((interaction) => ({
        id: `${interaction.source}-${interaction.target}`,
        source: interaction.source,
        target: interaction.target,
        label: `${interaction.label} / ${interaction.data}`,
      }))
  }

  let selectedId = $state<string | null>(null)

  $effect(() => {
    const unsubscribe = selectedGlossaryId.subscribe((v) => {
      selectedId = v
    })
    return unsubscribe
  })

  const diffEdges = $derived(
    isDiff ? computeDiffEdges(baseInteractions, interactions) : null
  )

  const nodesStore = writable<Node[]>([])
  const edgesStore = writable<Edge[]>([])

  let layout = $derived(buildHierarchicalLayout(glossary, selectedId))

  $effect(() => {
    nodesStore.set(layout.nodes)
  })

  $effect(() => {
    edgesStore.set(buildEdges(glossary, interactions, diffEdges))
  })

  const flowHeight = $derived(
    Math.max(layout.totalHeight + 100, 300)
  )
</script>

<div style="height: {flowHeight}px;" class="w-full border border-gray-200 rounded-lg overflow-hidden">
  <SvelteFlow nodes={nodesStore} edges={edgesStore} fitView>
    <Background />
  </SvelteFlow>
</div>
