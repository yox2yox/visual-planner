<script lang="ts">
  import { writable } from 'svelte/store'
  import { SvelteFlow, Background } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import type { Node, Edge } from '@xyflow/svelte'
  import type { GlossaryItem, Interaction, DiffEdge } from '../types'
  import { computeDiffEdges } from '../utils/diff'
  import { selectedGlossaryId } from '../stores'

  interface Props {
    glossary: GlossaryItem[]
    interactions: Interaction[]
    isDiff?: boolean
    baseInteractions?: Interaction[]
  }

  const { glossary, interactions, isDiff = false, baseInteractions = [] }: Props = $props()

  const COLS = 3
  const NODE_W = 180
  const NODE_H = 60
  const GAP_X = 60
  const GAP_Y = 60

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
  const defaultIcons: Record<string, string> = {
    term: '📖',
    feature: '⚡',
    data: '💾',
  }

  function buildNodes(items: GlossaryItem[], selectedId: string | null): Node[] {
    return items.map((item, index) => {
      const col = index % COLS
      const row = Math.floor(index / COLS)
      const isSelected = selectedId === item.id
      return {
        id: item.id,
        position: { x: col * (NODE_W + GAP_X), y: row * (NODE_H + GAP_Y) },
        data: {
          label: `${item.icon ?? defaultIcons[item.type] ?? ''} ${item.name}`,
        },
        style: [
          `background: ${typeColors[item.type] ?? '#f3f4f6'};`,
          `border: 2px solid ${typeBorderColors[item.type] ?? '#6b7280'};`,
          'border-radius: 8px;',
          'padding: 8px 12px;',
          'font-size: 13px;',
          'font-weight: 600;',
          `min-width: ${NODE_W}px;`,
          isSelected ? 'box-shadow: 0 0 0 3px #3b82f6;' : '',
        ].join(' '),
      }
    })
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
  selectedGlossaryId.subscribe((v) => {
    selectedId = v
  })

  const diffEdges = $derived(
    isDiff ? computeDiffEdges(baseInteractions, interactions) : null
  )

  const nodesStore = writable<Node[]>([])
  const edgesStore = writable<Edge[]>([])

  $effect(() => {
    nodesStore.set(buildNodes(glossary, selectedId))
  })

  $effect(() => {
    edgesStore.set(buildEdges(glossary, interactions, diffEdges))
  })

  const flowHeight = $derived(
    Math.max(Math.ceil(glossary.length / COLS) * (NODE_H + GAP_Y) + GAP_Y + 100, 300)
  )
</script>

<div style="height: {flowHeight}px;" class="w-full border border-gray-200 rounded-lg overflow-hidden">
  <SvelteFlow nodes={nodesStore} edges={edgesStore} fitView>
    <Background />
  </SvelteFlow>
</div>
