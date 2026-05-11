<script lang="ts">
  import InlineGlossaryText from './InlineGlossaryText.svelte'
  import type { EvidenceRef, GlossaryItem, Metaphor } from '../types'

  interface Props {
    title: string
    description: string
    metaphor?: Metaphor
    takeaway?: string
    evidence?: EvidenceRef[]
    glossary: GlossaryItem[]
  }
  const { title, description, metaphor, takeaway, evidence = [], glossary }: Props = $props()

  function formatEvidence(ref: EvidenceRef): string {
    if (ref.startLine && ref.endLine && ref.endLine !== ref.startLine) {
      return `${ref.path}:${ref.startLine}-${ref.endLine}`
    }
    if (ref.startLine) return `${ref.path}:${ref.startLine}`
    return ref.path
  }
</script>

<header class="bg-white border-b border-gray-200 px-6 py-6">
  <div class="max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900">{title}</h1>
    {#if description}
      <p class="mt-2 text-gray-600 text-base max-w-4xl">
        <InlineGlossaryText text={description} glossary={glossary} />
      </p>
    {/if}

    {#if metaphor || takeaway || evidence.length > 0}
      <div class="mt-5 grid gap-3 md:grid-cols-3">
        {#if metaphor}
          <section class="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">全体のたとえ</p>
            <h2 class="mt-1 text-lg font-bold text-gray-900">{metaphor.title}</h2>
            <p class="mt-1 text-sm leading-6 text-gray-700">
              <InlineGlossaryText text={metaphor.description} glossary={glossary} />
            </p>
          </section>
        {/if}

        {#if takeaway}
          <section class="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-600">ひと言で</p>
            <p class="mt-1 text-base font-semibold leading-7 text-gray-900">
              <InlineGlossaryText text={takeaway} glossary={glossary} />
            </p>
          </section>
        {/if}

        {#if evidence.length > 0}
          <section class="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-600">主な裏付け</p>
            <ul class="mt-2 space-y-1">
              {#each evidence as ref}
                <li class="text-xs text-gray-700">
                  <span class="font-medium">{ref.label ?? '参照'}</span>
                  <span class="ml-1 font-mono">{formatEvidence(ref)}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      </div>
    {/if}
  </div>
</header>
