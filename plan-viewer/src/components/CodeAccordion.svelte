<script lang="ts">
  import type { CodeSnippet } from '../types'
  import { normalizeCode } from '../utils/normalizeCode'

  interface Props {
    snippets: CodeSnippet[]
    compact?: boolean
  }

  const { snippets, compact = false }: Props = $props()

  let openIndexes = $state<Set<number>>(new Set())

  function toggle(index: number) {
    const next = new Set(openIndexes)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    openIndexes = next
  }

  function headerLabel(s: CodeSnippet): string {
    if (s.label) return s.label
    if (s.path && s.startLine != null && s.endLine != null && s.endLine !== s.startLine) {
      return `${s.path}:${s.startLine}-${s.endLine}`
    }
    if (s.path && s.startLine != null) return `${s.path}:${s.startLine}`
    if (s.path) return s.path
    return s.language ? `code (${s.language})` : 'code'
  }
</script>

{#if snippets.length > 0}
  <div class={compact ? 'mt-2 space-y-1' : 'mt-3 space-y-2'}>
    {#each snippets as snippet, i}
      {@const open = openIndexes.has(i)}
      <div class="rounded border border-gray-200 bg-white/60">
        <button
          type="button"
          class="flex w-full items-center gap-2 px-2 py-1 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 {compact ? 'text-[11px]' : 'text-xs'}"
          aria-expanded={open}
          onclick={(e: MouseEvent) => { e.stopPropagation(); toggle(i) }}
        >
          <span class="w-3 text-gray-400">{open ? '▼' : '▶'}</span>
          <span class="font-mono truncate flex-1">{headerLabel(snippet)}</span>
          {#if snippet.language}
            <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{snippet.language}</span>
          {/if}
        </button>
        {#if open}
          <pre
            class="snippet-pre overflow-x-auto whitespace-pre rounded-b border-t border-gray-100 bg-gray-50 px-3 py-2 font-mono text-gray-800 {compact ? 'text-[11px] max-h-64 overflow-y-auto leading-relaxed' : 'text-xs leading-relaxed'}"
          ><code>{normalizeCode(snippet.code)}</code></pre>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .snippet-pre {
    tab-size: 2;
    -moz-tab-size: 2;
  }
</style>
