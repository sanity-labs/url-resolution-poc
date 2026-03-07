import { client } from '$lib/sanity'
import { resolver } from '$lib/routes'
import { BLOG_POST_BY_SLUG_QUERY } from '$lib/queries'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const [post, urlMap] = await Promise.all([
    client.fetch(BLOG_POST_BY_SLUG_QUERY, { slug: params.slug }),
    resolver.preload(),
  ])

  if (!post) throw error(404, 'Blog post not found')

  return { post, urlMap }
}
