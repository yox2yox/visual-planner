<script lang="ts">
  import { onDestroy } from 'svelte'
  import type { GlossaryItem } from '../types'
  import { selectedGlossaryId } from '../stores'
  import { parseGlossaryLinks } from '../utils/glossaryLinks'

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

  function selectGlossaryItem(event: MouseEvent, id: string) {
    event.stopPropagation()
    selectedGlossaryId.set(id)
  }

  function glossaryDescription(id: string): string {
    return glossaryMap.get(id)?.description ?? ''
  }

  function startTooltipTimer(key: string) {
    clearTooltipTimer()
    hoverTimer = setTimeout(() => {
      activeTooltipKey = key
      hoverTimer = null
    }, 1000)
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
      {#if glossaryDescription(segment.id) && activeTooltipKey === tooltipKey}
        <span
          role="tooltip"
          class="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max max-w-xs -translate-x-1/2 whitespace-normal rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-xs font-normal leading-5 text-gray-700 shadow-lg"
        >
          {glossaryDescription(segment.id)}
        </span>
      {/if}
    </span>
  {:else}
    {segment.text}
  {/if}
{/each}
