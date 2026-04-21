<script lang="ts">
  import { decodePlan } from './utils/decode'
  import { normalizePlan } from './utils/normalize'
  import type { Plan, StatePair } from './types'
  import Header from './components/Header.svelte'
  import GlossaryPanel from './components/GlossaryPanel.svelte'
  import InteractionFlow from './components/InteractionFlow.svelte'

  interface LoadResult {
    plan: Plan | null
    pairs: StatePair[]
    error: string | null
  }

  function loadPlan(): LoadResult {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('plan')
    if (!encoded) {
      return { plan: null, pairs: [], error: 'URLクエリパラメータ ?plan= が指定されていません。' }
    }
    try {
      const plan = decodePlan(encoded)
      const normalized = normalizePlan(plan)
      return { plan, pairs: normalized.pairs, error: null }
    } catch (e) {
      return {
        plan: null,
        pairs: [],
        error: `プランのデコードに失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      }
    }
  }

  const { plan, pairs, error } = loadPlan()
</script>

<div class="min-h-screen bg-gray-50">
  {#if error}
    <div class="flex items-center justify-center min-h-screen">
      <div class="bg-red-50 border border-red-200 text-red-800 rounded-lg p-8 max-w-lg text-center">
        <p class="text-lg font-semibold mb-2">エラー</p>
        <p class="text-sm">{error}</p>
      </div>
    </div>
  {:else if plan}
    <Header title={plan.title} description={plan.description} />

    <main class="max-w-7xl mx-auto">
      <GlossaryPanel items={plan.glossary} />

      {#each pairs as pair, i (i)}
        <section class="px-6 py-6 border-t border-gray-200">
          {#if pair.title}
            <h2 class="text-2xl font-bold text-gray-900 mb-1">{pair.title}</h2>
          {/if}
          {#if pair.description}
            <p class="text-gray-600 text-sm mb-4">{pair.description}</p>
          {/if}

          {#if pair.currentState}
            <div class="mt-4">
              <h3 class="text-lg font-semibold text-gray-800 mb-1">AS-IS（現状）</h3>
              {#if pair.currentState.description}
                <p class="text-gray-600 text-sm mb-4">{pair.currentState.description}</p>
              {/if}
              <InteractionFlow
                glossary={plan.glossary}
                interactions={pair.currentState.interactions}
              />
            </div>
          {/if}

          {#if pair.proposedState}
            <div class="mt-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-1">TO-BE（変更後）</h3>
              {#if pair.proposedState.description}
                <p class="text-gray-600 text-sm mb-4">{pair.proposedState.description}</p>
              {/if}
              <InteractionFlow
                glossary={plan.glossary}
                interactions={pair.proposedState.interactions}
                isDiff={pair.currentState !== undefined}
                baseInteractions={pair.currentState?.interactions ?? []}
              />
            </div>
          {/if}
        </section>
      {/each}
    </main>
  {/if}
</div>
