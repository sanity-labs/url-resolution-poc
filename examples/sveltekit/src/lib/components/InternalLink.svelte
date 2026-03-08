<script lang="ts">
  import { getContext } from 'svelte'

  let { portableText, children }: { portableText: any; children: any } = $props()

  const urlMap = getContext<Record<string, string>>('urlMap')

  const ref = portableText?.markDef?.reference?._ref
  const url = ref ? urlMap?.[ref] : undefined

  function getPath(url: string | undefined): string {
    if (!url) return '#'
    try { return new URL(url).pathname } catch { return url }
  }
</script>

{#if url}
  <a href={getPath(url)}>
    {@render children?.()}
  </a>
{:else}
  <span>
    {@render children?.()}
  </span>
{/if}
