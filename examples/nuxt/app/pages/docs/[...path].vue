<script setup lang="ts">
import { ARTICLE_BY_SLUG_QUERY } from '~/lib/queries'

const route = useRoute()

const pathSegments = Array.isArray(route.params.path)
  ? route.params.path
  : (route.params.path as string).split('/')
const lastSlug = pathSegments[pathSegments.length - 1]

const { data } = await useAsyncData(`docs-${pathSegments.join('-')}`, async () => {
  const client = useSanityClient()
  const resolver = useRouteResolver()

  const [article, urlMap] = await Promise.all([
    client.fetch(ARTICLE_BY_SLUG_QUERY, { slug: lastSlug }),
    resolver.preload(),
  ])

  return { article, urlMap }
})

if (!data.value?.article) {
  throw createError({ statusCode: 404, statusMessage: 'Article not found' })
}
</script>

<template>
  <article v-if="data?.article">
    <h1>{{ data.article.title }}</h1>
    <PortableTextBody v-if="data.article.body" :value="data.article.body" :url-map="data.urlMap" />
  </article>
</template>
