<script setup lang="ts">
import { BLOG_POST_BY_SLUG_QUERY } from '~/lib/queries'

const route = useRoute()

const { data } = await useAsyncData(`blog-${route.params.slug}`, async () => {
  const client = useSanityClient()
  const resolver = useRouteResolver()

  const [post, urlMap] = await Promise.all([
    client.fetch(BLOG_POST_BY_SLUG_QUERY, { slug: route.params.slug as string }),
    resolver.preload(),
  ])

  return { post, urlMap }
})

if (!data.value?.post) {
  throw createError({ statusCode: 404, statusMessage: 'Blog post not found' })
}
</script>

<template>
  <article v-if="data?.post">
    <h1>{{ data.post.title }}</h1>
    <PortableTextBody :value="data.post.body" :url-map="data.urlMap" />
  </article>
</template>
