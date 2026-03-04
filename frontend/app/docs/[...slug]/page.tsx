import { PortableText } from '@portabletext/react'
import { client } from '@/lib/sanity'
import { resolver } from '@/lib/routes'

interface Props {
  params: Promise<{ slug: string[] }>
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const slugPath = slug.join('/')

  // Find the article by matching its resolved path
  // We need to find the article whose path matches the URL slug
  const article = await client.fetch(
    `*[_type == "article" && slug.current == $lastSlug][0]{
      _id, title, body,
      "resolvedPath": coalesce(
        *[_type == "docsNavSection" && references(^._id)][0].slug.current + "/" ,
        ""
      ) + slug.current
    }`,
    { lastSlug: slug[slug.length - 1] }
  )

  if (!article) {
    return <h1>Article not found</h1>
  }

  // Pre-load all route map shards for synchronous PT link resolution
  const urlMap = await resolver.preload()

  return (
    <article>
      <nav><a href="/">← Home</a></nav>
      <h1>{article.title}</h1>
      <p><code>Resolved path: /docs/{article.resolvedPath}</code></p>
      {article.body && (
        <PortableText
          value={article.body}
          components={{
            marks: {
              internalLink: ({ value, children }: any) => {
                const url = urlMap.get(value.reference._ref)
                return url ? <a href={url}>{children}</a> : <span>{children}</span>
              },
            },
          }}
        />
      )}
    </article>
  )
}
