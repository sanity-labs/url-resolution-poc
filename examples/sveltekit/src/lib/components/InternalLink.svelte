<script lang="ts">
  import { getPath } from '@sanity/routes'
  import { getContext } from 'svelte'

  let { portableText, children }: { portableText: any; children: any } = $props()

  const urlMap = getContext<Record<string, string>>('urlMap')

  const ref = portableText?.markDef?.reference?._ref
  const url = ref ? urlMap?.[ref] : undefined

</script>

{#if url}
  <a href={getPath(url) ?? '#'}>
    {@render children?.()}
  </a>
{:else}
  <span>
    {@render children?.()}
  </span>
{/if}
