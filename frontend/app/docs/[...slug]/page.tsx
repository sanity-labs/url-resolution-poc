import { PortableText } from '@portabletext/react'
import { sanityFetch } from '@/lib/live'
import { resolver } from '@/lib/routes'
import { CodeBlock } from '@/components/CodeBlock'
import { ARTICLE_BY_SLUG_QUERY } from '@/lib/queries'

interface Props {
  params: Promise<{ slug: string[] }>
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params

  const { data: article } = await sanityFetch({
    query: ARTICLE_BY_SLUG_QUERY,
    params: { lastSlug: slug[slug.length - 1] },
  })

  if (!article) {
    return <h1>Article not found</h1>
  }

  const urlMap = await resolver.preload()

  return (
    <article>
      <nav><a href="/">← Home</a></nav>
      <h1>{article.title}</h1>
      {article.body && (
        <PortableText
          value={article.body}
          components={{
            types: {
              code: ({ value }: { value: { code?: string; language?: string } }) => (
                <CodeBlock code={value.code ?? ''} language={value.language} />
              ),
            },
            marks: {
              internalLink: ({ value, children }: { value?: { reference?: { _ref: string } }; children: React.ReactNode }) => {
                const url = value?.reference ? urlMap.get(value.reference._ref) : undefined
                return url ? <a href={url}>{children}</a> : <span>{children}</span>
              },
            },
          }}
        />
      )}
    </article>
  )
}
