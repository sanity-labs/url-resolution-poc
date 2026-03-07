import type { Route } from './+types/blog.$slug'
import { client } from '~/lib/sanity.server'
import { resolver } from '~/lib/routes.server'
import { BLOG_POST_BY_SLUG_QUERY } from '~/lib/queries'
import { PortableTextBody } from '~/components/PortableTextBody'
import { data } from 'react-router'

export async function loader({ params }: Route.LoaderArgs) {
  const [post, urlMap] = await Promise.all([
    client.fetch(BLOG_POST_BY_SLUG_QUERY, { slug: params.slug }),
    resolver.preload(),
  ])

  if (!post) throw data(null, { status: 404 })

  return { post, urlMap: Object.fromEntries(urlMap) }
}

export default function BlogPost({ loaderData }: Route.ComponentProps) {
  const { post, urlMap } = loaderData

  return (
    <article>
      <h1>{post.title}</h1>
      <PortableTextBody value={post.body} urlMap={urlMap} />
    </article>
  )
}
