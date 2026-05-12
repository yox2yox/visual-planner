<script lang="ts">
  import type { GlossaryItem } from '../types'
  import { glossaryTypeBadgeColors, glossaryTypeColors, glossaryTypeIcons, glossaryTypeLabels } from '../utils/glossaryDisplay'
  import { glossaryLinksToPlainText } from '../utils/glossaryLinks'
  import CodeAccordion from './CodeAccordion.svelte'

  interface Props {
    item: GlossaryItem
    validIds: ReadonlySet<string>
    closeLabel?: string
    onclose?: (event: MouseEvent) => void
  }

  const { item, validIds, closeLabel, onclose }: Props = $props()

  function tooltipText(value?: string): string {
    return glossaryLinksToPlainText(value ?? '', validIds)
  }
</script>

<div
  role="tooltip"
  class="pointer-events-auto absolute left-1/2 top-full z-30 mt-2 block w-96 max-w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 whitespace-normal rounded-lg border p-3 text-left text-xs font-normal leading-5 shadow-xl {glossaryTypeColors[item.type]}"
>
  <span class="flex items-start gap-2">
    <span class="flex min-w-0 flex-1 items-center gap-2">
      <span class="text-lg leading-none">{item.icon ?? glossaryTypeIcons[item.type]}</span>
      <span class="rounded px-2 py-0.5 text-[11px] font-medium leading-4 {glossaryTypeBadgeColors[item.type]}">
        {glossaryTypeLabels[item.type]}
      </span>
      <span class="min-w-0 flex-1 truncate text-sm font-bold text-gray-900">{item.name}</span>
    </span>
    {#if onclose}
      <button
        type="button"
        aria-label={closeLabel ?? `${item.name} のチップを閉じる`}
        class="shrink-0 rounded px-1.5 py-0.5 text-sm leading-4 text-gray-500 hover:bg-white/70 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        onclick={onclose}
      >
        ×
      </button>
    {/if}
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
  {#if item.codeSnippets && item.codeSnippets.length > 0}
    <CodeAccordion snippets={item.codeSnippets} compact />
  {/if}
</div>
