<script lang="ts">
  import type { GlossaryItem } from '../types'
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

  function tooltipText(value?: string): string {
    return glossaryLinksToPlainText(value ?? '', validIds)
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
        <span
          role="tooltip"
          class="pointer-events-auto absolute left-1/2 top-full z-30 mt-2 block w-80 max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 whitespace-normal rounded-lg border p-3 text-left text-xs font-normal leading-5 shadow-xl {glossaryTypeColors[item.type]}"
        >
          <span class="flex items-start gap-2">
            <span class="flex min-w-0 flex-1 items-center gap-2">
              <span class="text-lg leading-none">{item.icon ?? glossaryTypeIcons[item.type]}</span>
              <span class="rounded px-2 py-0.5 text-[11px] font-medium leading-4 {glossaryTypeBadgeColors[item.type]}">
                {glossaryTypeLabels[item.type]}
              </span>
              <span class="min-w-0 flex-1 truncate text-sm font-bold text-gray-900">{item.name}</span>
            </span>
            <button
              type="button"
              aria-label="{item.name} のチップを閉じる"
              class="shrink-0 rounded px-1.5 py-0.5 text-sm leading-4 text-gray-500 hover:bg-white/70 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              onclick={(event) => closeTooltip(event, tooltipKey)}
            >
              ×
            </button>
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
