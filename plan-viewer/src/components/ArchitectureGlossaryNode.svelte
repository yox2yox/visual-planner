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
  }: NodeProps & { data: ArchitectureNodeData } = $props()

  const item = $derived(data.item)
  const validIds = $derived(data.validIds ?? new Set<string>())

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

  // Every node exposes 4 sides × 2 kinds = 8 handles. The actual handle used
  // for any given edge is decided in `edgeRouting.ts` from the relative
  // position of the two nodes, so we just need to make all of them available.
  // Handle ids must match `handleId(side, kind)` in `edgeRouting.ts`.
  const sides = [
    { side: 'top', position: Position.Top },
    { side: 'right', position: Position.Right },
    { side: 'bottom', position: Position.Bottom },
    { side: 'left', position: Position.Left },
  ] as const
</script>

{#each sides as { side, position } (side)}
  <Handle id={`${side}-t`} type="target" {position} class="handle-dot" />
  <Handle id={`${side}-s`} type="source" {position} class="handle-dot" />
{/each}
{#if item}
  <div class="relative block">
    <button
      type="button"
      class:group-trigger={data.isGroup}
      class:leaf-trigger={!data.isGroup}
      aria-describedby={data.tooltipVisible ? `architecture-tooltip-${id}` : undefined}
      aria-expanded={data.tooltipVisible}
      class="inline-flex min-w-0 items-center gap-1.5 rounded text-left font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
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

<style>
  .leaf-trigger {
    width: 100%;
  }

  .group-trigger {
    max-width: 100%;
  }

  /* Render the 8 handles as a single tiny dot at each side so they don't
     visually clutter the node. Svelte Flow positions source/target handles at
     the same coordinate by default, which is fine for routing — we just hide
     the duplicate. */
  :global(.svelte-flow__handle.handle-dot) {
    width: 6px;
    height: 6px;
    background: #94a3b8;
    border: 1px solid #fff;
  }
</style>
