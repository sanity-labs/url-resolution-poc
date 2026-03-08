<script lang="ts">
  import { getPath } from '@sanity/routes'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  function getPathById(id: string): string {
    const url = data.urlMap[id]
    if (!url) return '#'
    return getPath(url) ?? url
  }
</script>

<h1>URL Resolution POC</h1>
<p>Proving two-tier URL resolution for Sanity structured content — SvelteKit edition.</p>

<section>
  <h2>Articles</h2>
  <ul>
    {#each data.articles as article}
      <li>
        <a href={getPathById(article._id)}>{article.title}</a>
        <code> → {getPathById(article._id)}</code>
      </li>
    {/each}
  </ul>
</section>

<section>
  <h2>Blog Posts</h2>
  <ul>
    {#each data.posts as post}
      <li>
        <a href={getPathById(post._id)}>{post.title}</a>
        <code> → {getPathById(post._id)}</code>
      </li>
    {/each}
  </ul>
</section>
