<script lang="ts">
  import type { GlossaryItem } from '../types'
  import { selectedGlossaryId } from '../stores'
  import { parseGlossaryLinks } from '../utils/glossaryLinks'

  interface Props {
    text?: string | null
    glossary: GlossaryItem[]
  }

  const { text = '', glossary }: Props = $props()

  const validIds = $derived(new Set(glossary.map((item) => item.id)))
  const segments = $derived(parseGlossaryLinks(text ?? '', validIds))

  function selectGlossaryItem(event: MouseEvent, id: string) {
    event.stopPropagation()
    selectedGlossaryId.set(id)
  }
</script>

{#each segments as segment}
  {#if segment.type === 'glossary-link'}
    <button
      type="button"
      class="inline p-0 align-baseline font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900 hover:decoration-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
      onclick={(event) => selectGlossaryItem(event, segment.id)}
    >
      {segment.label}
    </button>
  {:else}
    {segment.text}
  {/if}
{/each}
