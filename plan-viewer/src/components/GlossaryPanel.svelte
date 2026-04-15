<script lang="ts">
  import type { GlossaryItem, GlossaryType } from '../types'
  import { filterGlossary } from '../utils/filter'
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

  let filtered = $derived(filterGlossary(items, activeTab))
  let selectedId = $state<string | null>(null)

  selectedGlossaryId.subscribe((v) => {
    selectedId = v
  })

  function handleCardClick(id: string) {
    selectedGlossaryId.update((current) => (current === id ? null : id))
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
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each filtered as item (item.id)}
      <button
        class="text-left p-4 rounded-lg border cursor-pointer transition-all {typeColors[item.type]} {selectedId === item.id ? 'ring-2 ring-offset-1 ring-blue-400' : 'hover:shadow-md'}"
        onclick={() => handleCardClick(item.id)}
      >
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xl">{item.icon ?? defaultIcons[item.type]}</span>
          <span class="text-xs font-medium px-2 py-0.5 rounded {typeBadgeColors[item.type]}">
            {typeLabels[item.type]}
          </span>
        </div>
        <p class="font-bold text-gray-900 text-sm">{item.name}</p>
        {#if item.description}
          <p class="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
        {/if}
      </button>
    {/each}
  </div>
</section>
