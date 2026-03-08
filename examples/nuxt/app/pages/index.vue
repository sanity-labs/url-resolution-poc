<script setup lang="ts">
import { ARTICLES_QUERY, BLOG_POSTS_QUERY } from '~/lib/queries'

const { data } = await useAsyncData('home', async () => {
  const client = useSanityClient()
  const resolver = useRouteResolver()

  const [articles, posts, urlMap] = await Promise.all([
    client.fetch(ARTICLES_QUERY),
    client.fetch(BLOG_POSTS_QUERY),
    resolver.preload(),
  ])

  return { articles, posts, urlMap }
})

function getPath(id: string): string {
  const url = data.value?.urlMap[id]
  if (!url) return '#'
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}
</script>

<template>
  <div v-if="data">
    <h1>URL Resolution POC</h1>
    <p>
      Proving two-tier URL resolution for Sanity structured content —
      Nuxt edition.
    </p>

    <section>
      <h2>Articles</h2>
      <ul>
        <li v-for="a in data.articles" :key="a._id">
          <NuxtLink :to="getPath(a._id)">{{ a.title }}</NuxtLink>
          <code> → {{ getPath(a._id) }}</code>
        </li>
      </ul>
    </section>

    <section>
      <h2>Blog Posts</h2>
      <ul>
        <li v-for="p in data.posts" :key="p._id">
          <NuxtLink :to="getPath(p._id)">{{ p.title }}</NuxtLink>
          <code> → {{ getPath(p._id) }}</code>
        </li>
      </ul>
    </section>
  </div>
</template>
