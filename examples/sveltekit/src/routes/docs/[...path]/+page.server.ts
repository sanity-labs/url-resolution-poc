import { client } from '$lib/sanity'
import { resolver } from '$lib/routes'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  // Extract the last segment as the slug (handles /docs/section/slug)
  const segments = params.path.split('/')
  const lastSlug = segments[segments.length - 1]

  const [article, urlMap] = await Promise.all([
    client.fetch<{ _id: string; title: string; body: any } | null>(
      `*[_type == "article" && slug.current == $slug][0]{ _id, title, body }`,
      { slug: lastSlug },
    ),
    resolver.preload(),
  ])

  if (!article) error(404, 'Article not found')

  return { article, urlMap }
}
