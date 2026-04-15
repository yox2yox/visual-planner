<script lang="ts">
  import { decodePlan } from './utils/decode'
  import type { Plan } from './types'
  import Header from './components/Header.svelte'
  import GlossaryPanel from './components/GlossaryPanel.svelte'
  import InteractionFlow from './components/InteractionFlow.svelte'

  function loadPlan(): { plan: Plan | null; error: string | null } {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('plan')
    if (!encoded) {
      return { plan: null, error: 'URLクエリパラメータ ?plan= が指定されていません。' }
    }
    try {
      const plan = decodePlan(encoded)
      return { plan, error: null }
    } catch (e) {
      return {
        plan: null,
        error: `プランのデコードに失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      }
    }
  }

  const { plan, error } = loadPlan()
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

      {#if plan.currentState}
        <section class="px-6 py-6 border-t border-gray-200">
          <h2 class="text-xl font-semibold text-gray-800 mb-1">AS-IS（現状）</h2>
          {#if plan.currentState.description}
            <p class="text-gray-600 text-sm mb-4">{plan.currentState.description}</p>
          {/if}
          <InteractionFlow
            glossary={plan.glossary}
            interactions={plan.currentState.interactions}
          />
        </section>
      {/if}

      {#if plan.proposedState}
        <section class="px-6 py-6 border-t border-gray-200">
          <h2 class="text-xl font-semibold text-gray-800 mb-1">TO-BE（変更後）</h2>
          {#if plan.proposedState.description}
            <p class="text-gray-600 text-sm mb-4">{plan.proposedState.description}</p>
          {/if}
          <InteractionFlow
            glossary={plan.glossary}
            interactions={plan.proposedState.interactions}
            isDiff={plan.currentState !== undefined}
            baseInteractions={plan.currentState?.interactions ?? []}
          />
        </section>
      {/if}
    </main>
  {/if}
</div>
