<script lang="ts">
  import { onDestroy } from 'svelte'
  import type { GlossaryItem } from '../types'
  import { selectedGlossaryId } from '../stores'
  import { glossaryTypeBadgeColors, glossaryTypeColors, glossaryTypeIcons, glossaryTypeLabels } from '../utils/glossaryDisplay'
  import { glossaryLinksToPlainText, parseGlossaryLinks } from '../utils/glossaryLinks'

  interface Props {
    text?: string | null
    glossary: GlossaryItem[]
  }

  const { text = '', glossary }: Props = $props()

  const validIds = $derived(new Set(glossary.map((item) => item.id)))
  const glossaryMap = $derived(new Map(glossary.map((item) => [item.id, item])))
  const segments = $derived(parseGlossaryLinks(text ?? '', validIds))

  let activeTooltipKey = $state<string | null>(null)
  let hoverTimer: ReturnType<typeof setTimeout> | null = null
  const tooltipDelayMs = 500

  function selectGlossaryItem(event: MouseEvent, id: string) {
    event.stopPropagation()
    selectedGlossaryId.set(id)
  }

  function glossaryItem(id: string): GlossaryItem | undefined {
    return glossaryMap.get(id)
  }

  function tooltipText(value?: string): string {
    return glossaryLinksToPlainText(value ?? '', validIds)
  }

  function startTooltipTimer(key: string) {
    clearTooltipTimer()
    hoverTimer = setTimeout(() => {
      activeTooltipKey = key
      hoverTimer = null
    }, tooltipDelayMs)
  }

  function hideTooltip() {
    clearTooltipTimer()
    activeTooltipKey = null
  }

  function showTooltip(key: string) {
    clearTooltipTimer()
    activeTooltipKey = key
  }

  function clearTooltipTimer() {
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      hoverTimer = null
    }
  }

  onDestroy(clearTooltipTimer)
</script>

{#each segments as segment, i}
  {#if segment.type === 'glossary-link'}
    {@const tooltipKey = `${segment.id}-${i}`}
    {@const item = glossaryItem(segment.id)}
    <span class="relative inline-block">
      <button
        type="button"
        class="inline p-0 align-baseline font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900 hover:decoration-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        onmouseenter={() => startTooltipTimer(tooltipKey)}
        onmouseleave={hideTooltip}
        onfocus={() => showTooltip(tooltipKey)}
        onblur={hideTooltip}
        onclick={(event) => selectGlossaryItem(event, segment.id)}
      >
        {segment.label}
      </button>
      {#if item && activeTooltipKey === tooltipKey}
        <span
          role="tooltip"
          class="pointer-events-none absolute left-1/2 top-full z-30 mt-2 block w-80 max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 whitespace-normal rounded-lg border p-3 text-left text-xs font-normal leading-5 shadow-xl {glossaryTypeColors[item.type]}"
        >
          <span class="flex items-center gap-2">
            <span class="text-lg leading-none">{item.icon ?? glossaryTypeIcons[item.type]}</span>
            <span class="rounded px-2 py-0.5 text-[11px] font-medium leading-4 {glossaryTypeBadgeColors[item.type]}">
              {glossaryTypeLabels[item.type]}
            </span>
            <span class="min-w-0 flex-1 truncate text-sm font-bold text-gray-900">{item.name}</span>
          </span>
          {#if item.description}
            <span class="mt-2 block text-gray-700">{tooltipText(item.description)}</span>
          {/if}
          {#if item.persona || item.responsibility}
            <span class="mt-2 grid gap-1 text-gray-700">
              {#if item.persona}
                <span><span class="font-semibold">役名:</span> {tooltipText(item.persona)}</span>
              {/if}
              {#if item.responsibility}
                <span><span class="font-semibold">担当:</span> {tooltipText(item.responsibility)}</span>
              {/if}
            </span>
          {/if}
        </span>
      {/if}
    </span>
  {:else}
    {segment.text}
  {/if}
{/each}
