import { client } from '$lib/sanity'
import { resolver } from '$lib/routes'
import { ARTICLES_QUERY, BLOG_POSTS_QUERY } from '$lib/queries'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  const [articles, posts, urlMap] = await Promise.all([
    client.fetch(ARTICLES_QUERY),
    client.fetch(BLOG_POSTS_QUERY),
    resolver.preload(),
  ])

  // preload() returns a plain Record — works with any serialization format
  return { articles, posts, urlMap }
}
