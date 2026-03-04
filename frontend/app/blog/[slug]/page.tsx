import { sanityFetch } from '@/lib/live'
import { resolver } from '@/lib/routes'
import { PortableTextBody } from '@/components/PortableTextBody'
import { BLOG_POST_BY_SLUG_QUERY } from '@/lib/queries'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params

  const { data: post } = await sanityFetch({
    query: BLOG_POST_BY_SLUG_QUERY,
    params: { slug },
  })

  if (!post) {
    return <h1>Blog post not found</h1>
  }

  const urlMap = await resolver.preload()

  return (
    <article>
      <nav><a href="/">← Home</a></nav>
      <h1>{post.title}</h1>
      <PortableTextBody value={post.body} urlMap={urlMap} />
    </article>
  )
}
