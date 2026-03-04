import { PortableText } from '@portabletext/react'
import { sanityFetch } from '@/lib/live'
import { resolver } from '@/lib/routes'
import { CodeBlock } from '@/components/CodeBlock'

interface Props {
  params: Promise<{ slug: string[] }>
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params

  const { data: article } = await sanityFetch({
    query: `*[_type == "article" && slug.current == $lastSlug][0]{
      _id, title, body,
      "resolvedPath": coalesce(
        *[_type == "docsNavSection" && references(^._id)][0].slug.current + "/" ,
        ""
      ) + slug.current
    }`,
    params: { lastSlug: slug[slug.length - 1] },
  })

  if (!article) {
    return <h1>Article not found</h1>
  }

  const urlMap = await resolver.preload()

  return (
    <article>
      <nav><a href="/">← Home</a></nav>
      <h1>{(article as any).title}</h1>
      <p><code>Resolved path: /docs/{(article as any).resolvedPath}</code></p>
      {(article as any).body && (
        <PortableText
          value={(article as any).body}
          components={{
            types: {
              code: ({ value }: any) => (
                <CodeBlock code={value.code} language={value.language} />
              ),
            },
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
