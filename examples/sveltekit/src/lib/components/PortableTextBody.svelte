<script lang="ts">
  import { PortableText } from '@portabletext/svelte'
  import { setContext } from 'svelte'
  import InternalLink from './InternalLink.svelte'

  let { value, urlMap }: { value: any; urlMap: Map<string, string> } = $props()

  // Pass urlMap via Svelte context so mark components can access it
  setContext('urlMap', urlMap)
</script>

{#if value}
  <PortableText
    {value}
    components={{
      marks: {
        internalLink: InternalLink
      }
    }}
  />
{/if}
