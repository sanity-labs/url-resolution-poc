<script lang="ts">
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  function getPath(id: string): string {
    const url = data.urlMap[id]
    if (!url) return '#'
    try { return new URL(url).pathname } catch { return url }
  }
</script>

<h1>URL Resolution POC</h1>
<p>Proving two-tier URL resolution for Sanity structured content — SvelteKit edition.</p>

<section>
  <h2>Articles</h2>
  <ul>
    {#each data.articles as article}
      <li>
        <a href={getPath(article._id)}>{article.title}</a>
        <code> → {getPath(article._id)}</code>
      </li>
    {/each}
  </ul>
</section>

<section>
  <h2>Blog Posts</h2>
  <ul>
    {#each data.posts as post}
      <li>
        <a href={getPath(post._id)}>{post.title}</a>
        <code> → {getPath(post._id)}</code>
      </li>
    {/each}
  </ul>
</section>
