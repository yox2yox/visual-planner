<script lang="ts">
  import type { GlossaryItem } from '../types'
  import GlossaryTooltip from './GlossaryTooltip.svelte'
  import { parseGlossaryLinks } from '../utils/glossaryLinks'

  interface Props {
    text?: string | null
    glossary: GlossaryItem[]
  }

  const { text = '', glossary }: Props = $props()

  const validIds = $derived(new Set(glossary.map((item) => item.id)))
  const glossaryMap = $derived(new Map(glossary.map((item) => [item.id, item])))
  const segments = $derived(parseGlossaryLinks(text ?? '', validIds))

  let pinnedTooltipKeys = $state(new Set<string>())
  let hoveredTooltipKey = $state<string | null>(null)

  function pinTooltip(key: string) {
    pinnedTooltipKeys = new Set([...pinnedTooltipKeys, key])
  }

  function showHoverTooltip(key: string) {
    hoveredTooltipKey = key
  }

  function hideHoverTooltip(key: string) {
    if (hoveredTooltipKey === key) hoveredTooltipKey = null
  }

  function handleLinkClick(event: MouseEvent, key: string) {
    event.stopPropagation()
    event.preventDefault()
    pinTooltip(key)
  }

  function isTooltipVisible(key: string): boolean {
    return pinnedTooltipKeys.has(key) || hoveredTooltipKey === key
  }

  function glossaryItem(id: string): GlossaryItem | undefined {
    return glossaryMap.get(id)
  }

  function closeTooltip(event: MouseEvent, key: string) {
    event.stopPropagation()
    event.preventDefault()
    pinnedTooltipKeys = new Set([...pinnedTooltipKeys].filter((pinnedKey) => pinnedKey !== key))
    hideHoverTooltip(key)
  }
</script>

{#each segments as segment, i}
  {#if segment.type === 'glossary-link'}
    {@const tooltipKey = `${segment.id}-${i}`}
    {@const item = glossaryItem(segment.id)}
    <span class="relative inline-block">
      <button
        type="button"
        class="inline p-0 align-baseline font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900 hover:decoration-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        onmouseenter={() => showHoverTooltip(tooltipKey)}
        onmouseleave={() => hideHoverTooltip(tooltipKey)}
        onfocus={() => showHoverTooltip(tooltipKey)}
        onblur={() => hideHoverTooltip(tooltipKey)}
        onclick={(event) => handleLinkClick(event, tooltipKey)}
      >
        {segment.label}
      </button>
      {#if item && isTooltipVisible(tooltipKey)}
        <GlossaryTooltip {item} {validIds} onclose={(event) => closeTooltip(event, tooltipKey)} />
      {/if}
    </span>
  {:else}
    {segment.text}
  {/if}
{/each}
