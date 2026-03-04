import { sanityFetch } from '@/lib/live'
import { resolver } from '@/lib/routes'
import { PortableTextBody } from '@/components/PortableTextBody'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params

  const { data: post } = await sanityFetch({
    query: `*[_type == "blogPost" && slug.current == $slug][0]{
      _id, title, body
    }`,
    params: { slug },
  })

  if (!post) {
    return <h1>Blog post not found</h1>
  }

  const urlMap = await resolver.preload()

  return (
    <article>
      <nav><a href="/">← Home</a></nav>
      <h1>{(post as any).title}</h1>
      <PortableTextBody value={(post as any).body} urlMap={urlMap} />
    </article>
  )
}
