import { notFound } from 'next/navigation'
import { sanityFetch } from '@/lib/live'
import { resolver } from '@/lib/routes'
import { PortableTextBody } from '@/components/PortableTextBody'
import { ARTICLE_BY_SLUG_QUERY } from '@/lib/queries'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: article } = await sanityFetch({
    query: ARTICLE_BY_SLUG_QUERY,
    params: { lastSlug: slug[slug.length - 1] },
    stega: false,
  })
  return {
    title: article?.title ?? 'Documentation',
    description: `${article?.title} — URL Resolution documentation.`,
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params

  const [{ data: article }, urlMap] = await Promise.all([
    sanityFetch({ query: ARTICLE_BY_SLUG_QUERY, params: { lastSlug: slug[slug.length - 1] } }),
    resolver.preload(),
  ])

  if (!article) notFound()

  return (
    <article>
      <nav><a href="/">← Home</a></nav>
      <h1>{article.title}</h1>
      <PortableTextBody value={article.body} urlMap={urlMap} />
    </article>
  )
}
