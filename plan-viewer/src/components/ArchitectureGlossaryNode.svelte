<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte'
  import type { NodeProps } from '@xyflow/svelte'
  import type { GlossaryItem } from '../types'
  import { isArchitectureTooltipCloseKey, isArchitectureTooltipOpenKey } from '../utils/architectureTooltip'
  import GlossaryTooltip from './GlossaryTooltip.svelte'

  interface ArchitectureNodeData {
    item?: GlossaryItem
    validIds?: ReadonlySet<string>
    isGroup?: boolean
    tooltipVisible?: boolean
    onOpen?: (id: string) => void
    onClose?: () => void
  }

  let {
    id,
    data = {},
    targetPosition = Position.Top,
    sourcePosition = Position.Bottom,
  }: NodeProps & { data: ArchitectureNodeData } = $props()

  const item = $derived(data.item)
  const validIds = $derived(data.validIds ?? new Set<string>())

  function openTooltip(event: Event) {
    if (!item) return
    event.stopPropagation()
    data.onOpen?.(id)
  }

  function closeTooltip(event?: MouseEvent) {
    event?.stopPropagation()
    event?.preventDefault()
    data.onClose?.()
  }

  function handleKeydown(event: KeyboardEvent) {
    if (isArchitectureTooltipCloseKey(event.key) && data.tooltipVisible) {
      event.stopPropagation()
      event.preventDefault()
      data.onClose?.()
      return
    }

    if (isArchitectureTooltipOpenKey(event.key)) {
      event.stopPropagation()
      event.preventDefault()
      data.onOpen?.(id)
    }
  }
</script>

<Handle type="target" position={targetPosition} />
{#if item}
  <div class="relative block">
    <button
      type="button"
      class:group-trigger={data.isGroup}
      class:leaf-trigger={!data.isGroup}
      aria-describedby={data.tooltipVisible ? `architecture-tooltip-${id}` : undefined}
      aria-expanded={data.tooltipVisible}
      class="nodrag nopan inline-flex min-w-0 items-center gap-1.5 rounded text-left font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
      onclick={openTooltip}
      onkeydown={handleKeydown}
    >
      <span class="shrink-0">{item.icon}</span>
      <span class="min-w-0 truncate">{item.name}</span>
    </button>
    {#if data.tooltipVisible}
      <div id="architecture-tooltip-{id}">
        <GlossaryTooltip
          {item}
          {validIds}
          onclose={closeTooltip}
        />
      </div>
    {/if}
  </div>
{/if}
<Handle type="source" position={sourcePosition} />

<style>
  .leaf-trigger {
    width: 100%;
  }

  .group-trigger {
    max-width: 100%;
  }
</style>
