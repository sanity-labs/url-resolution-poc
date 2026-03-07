<script lang="ts">
  import type { PageData } from './$types'
  import PortableTextBody from '$lib/components/PortableTextBody.svelte'

  let { data }: { data: PageData } = $props()
</script>

<article>
  <h1>{data.post.title}</h1>
  <PortableTextBody value={data.post.body} urlMap={data.urlMap} />
</article>
