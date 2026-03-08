import { createFileRoute } from '@tanstack/react-router'
import { fetchArticle } from '~/lib/server-fns'
import { PortableTextBody } from '~/components/PortableTextBody'

export const Route = createFileRoute('/docs/$')(
  {
    loader: ({ params }) => {
      const segments = (params['_splat'] || '').split('/')
      const lastSlug = segments[segments.length - 1]
      return fetchArticle({ data: lastSlug })
    },
    component: DocsArticle,
    notFoundComponent: () => <h1>Article not found</h1>,
  },
)

function DocsArticle() {
  const { article, urlMap } = Route.useLoaderData()

  if (!article) {
    return <h1>Article not found</h1>
  }

  return (
    <article>
      <h1>{article.title}</h1>
      <PortableTextBody value={article.body} urlMap={urlMap} />
    </article>
  )
}
