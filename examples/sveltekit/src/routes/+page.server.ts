import { client } from '$lib/sanity'
import { resolver } from '$lib/routes'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  const [articles, posts, urlMap] = await Promise.all([
    client.fetch<Array<{ _id: string; title: string }>>(`*[_type == "article"] | order(title asc) { _id, title }`),
    client.fetch<Array<{ _id: string; title: string }>>(`*[_type == "blogPost"] | order(title asc) { _id, title }`),
    resolver.preload(),
  ])

  // SvelteKit uses devalue for serialization, which handles Maps natively.
  // In frameworks that use JSON serialization (e.g., Remix), you'd need:
  //   Object.fromEntries(urlMap)
  return { articles, posts, urlMap }
}
