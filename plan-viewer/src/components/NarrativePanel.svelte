<script lang="ts">
  import type { ComparisonRow, EvidenceRef, FlowState, GlossaryItem, StatePair } from '../types'
  import InlineGlossaryText from './InlineGlossaryText.svelte'

  interface Props {
    pair: StatePair
    glossary: GlossaryItem[]
  }

  const { pair, glossary }: Props = $props()

  const itemMap = $derived(new Map(glossary.map((item) => [item.id, item])))

  function formatEvidence(ref: EvidenceRef): string {
    if (ref.startLine && ref.endLine && ref.endLine !== ref.startLine) {
      return `${ref.path}:${ref.startLine}-${ref.endLine}`
    }
    if (ref.startLine) return `${ref.path}:${ref.startLine}`
    return ref.path
  }

  function actorName(id?: string): string | null {
    if (!id) return null
    const item = itemMap.get(id)
    if (!item) return id
    return item.persona ?? item.name
  }

  function diagramEdgeLabels(state: FlowState, edgeNumbers?: number[]): string[] {
    if (!edgeNumbers || edgeNumbers.length === 0) return []
    return edgeNumbers
      .map((order) => state.architectureEdges?.find((edge) => edge.order === order))
      .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge))
      .map((edge) => {
        const source = actorName(edge.source) ?? edge.source
        const target = actorName(edge.target) ?? edge.target
        return `${edge.order}. ${source} → ${target}: ${edge.label} / ${edge.data}`
      })
  }

  function hasStateNarrative(state?: FlowState): boolean {
    return Boolean(state?.storyTitle || state?.scenes?.length || state?.takeaway)
  }

  function hasComparison(rows?: ComparisonRow[]): boolean {
    return Boolean(rows?.length)
  }

  let hasNarrative = $derived(
    hasComparison(pair.comparison) ||
      hasStateNarrative(pair.currentState) ||
      hasStateNarrative(pair.proposedState) ||
      Boolean(pair.safeguards?.length || pair.takeaway || pair.evidence?.length),
  )
</script>

{#if hasNarrative}
  <div class="my-5 space-y-4">
    {#if hasComparison(pair.comparison)}
      <section class="rounded-lg border border-gray-200 bg-white p-4">
        <h3 class="text-base font-bold text-gray-900">設計変更の要点</h3>
        <div class="mt-3 overflow-x-auto">
          <table class="min-w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="py-2 pr-4 font-semibold">観点</th>
                <th class="py-2 pr-4 font-semibold">現状</th>
                <th class="py-2 pr-4 font-semibold">変更後</th>
                <th class="py-2 font-semibold">読みどころ</th>
              </tr>
            </thead>
            <tbody>
              {#each pair.comparison ?? [] as row}
                <tr class="border-b border-gray-100 align-top">
                  <th class="py-3 pr-4 text-left font-semibold text-gray-900">
                    <InlineGlossaryText text={row.label} glossary={glossary} />
                  </th>
                  <td class="py-3 pr-4 text-gray-700">
                    <InlineGlossaryText text={row.current ?? '-'} glossary={glossary} />
                  </td>
                  <td class="py-3 pr-4 text-gray-700">
                    <InlineGlossaryText text={row.proposed ?? '-'} glossary={glossary} />
                  </td>
                  <td class="py-3 text-gray-600">
                    <InlineGlossaryText text={row.note ?? '-'} glossary={glossary} />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}

    {#each [
      { label: 'AS-IS の設計説明', state: pair.currentState },
      { label: 'TO-BE の設計説明', state: pair.proposedState },
    ] as block}
      {#if hasStateNarrative(block.state)}
        <section class="rounded-lg border border-gray-200 bg-white p-4">
          <h3 class="text-base font-bold text-gray-900">{block.state?.storyTitle ?? block.label}</h3>
          {#if block.state?.scenes?.length}
            <ol class="mt-3 space-y-3">
              {#each block.state.scenes as scene, i}
                <li class="rounded-md border border-gray-100 bg-gray-50 p-3">
                  <div class="flex items-start gap-3">
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="font-semibold text-gray-900">
                        <InlineGlossaryText text={scene.title} glossary={glossary} />
                      </p>
                      {#if scene.actor}
                        <p class="mt-1 text-xs font-medium text-gray-500">中心要素: {actorName(scene.actor)}</p>
                      {/if}
                      <p class="mt-2 text-sm leading-6 text-gray-700">
                        <InlineGlossaryText text={scene.action} glossary={glossary} />
                      </p>
                      {#if scene.result}
                        <p class="mt-1 text-sm leading-6 text-gray-600">
                          <InlineGlossaryText text={scene.result} glossary={glossary} />
                        </p>
                      {/if}
                      {#if diagramEdgeLabels(block.state, scene.edgeRefs).length}
                        <ul class="mt-2 space-y-1">
                          {#each diagramEdgeLabels(block.state, scene.edgeRefs) as label}
                            <li class="text-xs text-gray-600">{label}</li>
                          {/each}
                        </ul>
                      {/if}
                      {#if scene.evidence?.length}
                        <ul class="mt-2 flex flex-wrap gap-2">
                          {#each scene.evidence as ref}
                            <li class="rounded bg-white px-2 py-1 text-xs text-gray-700 ring-1 ring-gray-200">
                              <span class="font-medium">{ref.label ?? '裏付け'}</span>
                              <span class="ml-1 font-mono">{formatEvidence(ref)}</span>
                            </li>
                          {/each}
                        </ul>
                      {/if}
                    </div>
                  </div>
                </li>
              {/each}
            </ol>
          {/if}
          {#if block.state?.takeaway}
            <p class="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold leading-6 text-gray-900">
              <InlineGlossaryText text={block.state.takeaway} glossary={glossary} />
            </p>
          {/if}
        </section>
      {/if}
    {/each}

    {#if pair.safeguards?.length || pair.evidence?.length || pair.takeaway}
      <section class="grid gap-3 md:grid-cols-3">
        {#if pair.safeguards?.length}
          <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 class="text-sm font-bold text-emerald-900">細かいけど大事な仕組み</h3>
            <ul class="mt-2 space-y-1">
              {#each pair.safeguards as item}
                <li class="text-sm leading-6 text-emerald-950">
                  <InlineGlossaryText text={item} glossary={glossary} />
                </li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if pair.evidence?.length}
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <h3 class="text-sm font-bold text-gray-900">この章の裏付け</h3>
            <ul class="mt-2 space-y-1">
              {#each pair.evidence as ref}
                <li class="text-xs text-gray-700">
                  <span class="font-medium">{ref.label ?? '参照'}</span>
                  <span class="ml-1 font-mono">{formatEvidence(ref)}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if pair.takeaway}
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 class="text-sm font-bold text-gray-900">ひと言で</h3>
            <p class="mt-2 text-sm font-semibold leading-6 text-gray-900">
              <InlineGlossaryText text={pair.takeaway} glossary={glossary} />
            </p>
          </div>
        {/if}
      </section>
    {/if}
  </div>
{/if}
