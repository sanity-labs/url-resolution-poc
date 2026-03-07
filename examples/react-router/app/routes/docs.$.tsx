import type { Route } from './+types/docs.$'
import { client } from '~/lib/sanity.server'
import { resolver } from '~/lib/routes.server'
import { ARTICLE_BY_SLUG_QUERY } from '~/lib/queries'
import { PortableTextBody } from '~/components/PortableTextBody'
import { data } from 'react-router'

export async function loader({ params }: Route.LoaderArgs) {
  const segments = (params['*'] || '').split('/')
  const lastSlug = segments[segments.length - 1]

  const [article, urlMap] = await Promise.all([
    client.fetch(ARTICLE_BY_SLUG_QUERY, { slug: lastSlug }),
    resolver.preload(),
  ])

  if (!article) throw data(null, { status: 404 })

  return { article, urlMap: Object.fromEntries(urlMap) }
}

export default function DocsArticle({ loaderData }: Route.ComponentProps) {
  const { article, urlMap } = loaderData

  return (
    <article>
      <h1>{article.title}</h1>
      <PortableTextBody value={article.body} urlMap={urlMap} />
    </article>
  )
}
