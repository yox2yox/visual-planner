<script lang="ts">
  import type { GlossaryItem, GlossaryType } from '../types'
  import { buildTree, filterTree, flattenTree, type TreeNode } from '../utils/filter'
  import { selectedGlossaryId } from '../stores'

  interface Props {
    items: GlossaryItem[]
  }
  const { items }: Props = $props()

  type Tab = GlossaryType | 'all'
  let activeTab = $state<Tab>('all')

  const tabs: { value: Tab; label: string }[] = [
    { value: 'all', label: 'すべて' },
    { value: 'term', label: '📖 用語' },
    { value: 'feature', label: '⚡ 機能' },
    { value: 'data', label: '💾 データ' },
  ]

  const defaultIcons: Record<GlossaryType, string> = {
    term: '📖',
    feature: '⚡',
    data: '💾',
  }

  const typeColors: Record<GlossaryType, string> = {
    term: 'bg-purple-100 text-purple-800 border-purple-200',
    feature: 'bg-blue-100 text-blue-800 border-blue-200',
    data: 'bg-green-100 text-green-800 border-green-200',
  }

  const typeBadgeColors: Record<GlossaryType, string> = {
    term: 'bg-purple-100 text-purple-700',
    feature: 'bg-blue-100 text-blue-700',
    data: 'bg-green-100 text-green-700',
  }

  const typeLabels: Record<GlossaryType, string> = {
    term: '用語',
    feature: '機能',
    data: 'データ',
  }

  let tree = $derived(buildTree(items))
  let filteredTree = $derived(filterTree(tree, activeTab))
  let flatNodes = $derived(flattenTree(filteredTree))
  let itemMap = $derived(new Map(items.map((i) => [i.id, i])))

  let selectedId = $state<string | null>(null)

  $effect(() => {
    const unsubscribe = selectedGlossaryId.subscribe((v) => {
      selectedId = v
    })
    return unsubscribe
  })

  function handleCardClick(id: string) {
    selectedGlossaryId.update((current) => (current === id ? null : id))
  }

  let collapsed = $state<Set<string>>(new Set())

  function toggleCollapse(id: string) {
    collapsed = new Set(collapsed)
    if (collapsed.has(id)) {
      collapsed.delete(id)
    } else {
      collapsed.add(id)
    }
  }

  function isVisible(node: TreeNode): boolean {
    let current = node.item.parentId
    const seen = new Set<string>()
    while (current && itemMap.has(current) && !seen.has(current)) {
      seen.add(current)
      if (collapsed.has(current)) return false
      current = itemMap.get(current)?.parentId
    }
    return true
  }

  function hasChildren(node: TreeNode): boolean {
    return node.children.length > 0
  }
</script>

<section class="px-6 py-6">
  <h2 class="text-xl font-semibold text-gray-800 mb-4">辞書</h2>
  <div class="flex gap-2 mb-4 border-b border-gray-200">
    {#each tabs as tab}
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === tab.value
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'}"
        onclick={() => { activeTab = tab.value }}
      >
        {tab.label}
      </button>
    {/each}
  </div>
  <div class="space-y-1">
    {#each flatNodes as node (node.item.id)}
      {#if isVisible(node)}
        <div
          class="w-full text-left rounded-lg border transition-all cursor-pointer {typeColors[node.item.type]} {selectedId === node.item.id ? 'ring-2 ring-offset-1 ring-blue-400' : 'hover:shadow-md'}"
          style="margin-left: {node.depth * 24}px; padding: {node.depth === 0 ? '12px 16px' : '8px 16px'};"
          role="button"
          tabindex="0"
          onclick={() => handleCardClick(node.item.id)}
          onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(node.item.id) }}
        >
          <div class="flex items-center gap-2">
            {#if hasChildren(node)}
              <button
                class="text-gray-400 hover:text-gray-600 w-5 h-5 flex items-center justify-center flex-shrink-0"
                onclick={(e: MouseEvent) => { e.stopPropagation(); toggleCollapse(node.item.id) }}
              >
                <span class="text-xs">{collapsed.has(node.item.id) ? '▶' : '▼'}</span>
              </button>
            {:else}
              <span class="w-5 flex-shrink-0"></span>
            {/if}
            <span class="text-lg">{node.item.icon ?? defaultIcons[node.item.type]}</span>
            <span class="text-xs font-medium px-2 py-0.5 rounded {typeBadgeColors[node.item.type]}">
              {typeLabels[node.item.type]}
            </span>
            <p class="font-bold text-gray-900 text-sm flex-1">{node.item.name}</p>
          </div>
          {#if node.item.description}
            <p class="text-xs text-gray-600 mt-1 ml-7 line-clamp-2">{node.item.description}</p>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</section>
