<script lang="ts">
  interface Props {
    title: string
    description: string
  }
  const { title, description }: Props = $props()
</script>

<header class="bg-white border-b border-gray-200 px-6 py-6">
  <h1 class="text-3xl font-bold text-gray-900">{title}</h1>
  {#if description}
    <p class="mt-2 text-gray-600 text-base">{description}</p>
  {/if}
</header>
