import { client } from '$lib/sanity'
import { resolver } from '$lib/routes'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const [post, urlMap] = await Promise.all([
    client.fetch<{ _id: string; title: string; body: any } | null>(
      `*[_type == "blogPost" && slug.current == $slug][0]{ _id, title, body }`,
      { slug: params.slug },
    ),
    resolver.preload(),
  ])

  if (!post) error(404, 'Blog post not found')

  return { post, urlMap }
}
