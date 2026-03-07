import { client } from '$lib/sanity'
import { resolver } from '$lib/routes'
import { ARTICLE_BY_SLUG_QUERY } from '$lib/queries'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const segments = params.path.split('/')
  const lastSlug = segments[segments.length - 1]

  const [article, urlMap] = await Promise.all([
    client.fetch(ARTICLE_BY_SLUG_QUERY, { slug: lastSlug }),
    resolver.preload(),
  ])

  if (!article) throw error(404, 'Article not found')

  return { article, urlMap }
}
