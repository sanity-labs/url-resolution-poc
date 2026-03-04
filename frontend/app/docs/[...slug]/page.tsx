import { sanityFetch } from '@/lib/live'
import { resolver } from '@/lib/routes'
import { PortableTextBody } from '@/components/PortableTextBody'

interface Props {
  params: Promise<{ slug: string[] }>
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params

  const { data: article } = await sanityFetch({
    query: `*[_type == "article" && slug.current == $lastSlug][0]{
      _id, title, body
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
      <PortableTextBody value={(article as any).body} urlMap={urlMap} />
    </article>
  )
}
