<script lang="ts">
  import type { PageData } from './$types'
  import PortableTextBody from '$lib/components/PortableTextBody.svelte'

  let { data }: { data: PageData } = $props()
</script>

<article>
  <h1>{data.article.title}</h1>
  <PortableTextBody value={data.article.body} urlMap={data.urlMap} />
</article>
