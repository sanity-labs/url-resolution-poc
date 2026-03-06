import { notFound } from 'next/navigation'
import { sanityFetch } from '@/lib/live'
import { resolver } from '@/lib/routes'
import { PortableTextBody } from '@/components/PortableTextBody'
import { BLOG_POST_BY_SLUG_QUERY } from '@/lib/queries'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: post } = await sanityFetch({
    query: BLOG_POST_BY_SLUG_QUERY,
    params: { slug },
    stega: false,
  })
  return {
    title: post?.title ?? 'Blog Post',
    description: `Read ${post?.title} on the URL Resolution POC blog.`,
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params

  const [{ data: post }, urlMap] = await Promise.all([
    sanityFetch({ query: BLOG_POST_BY_SLUG_QUERY, params: { slug } }),
    resolver.preload(),
  ])

  if (!post) notFound()

  return (
    <article>
      <nav><a href="/">← Home</a></nav>
      <h1>{post.title}</h1>
      <PortableTextBody value={post.body} urlMap={urlMap} />
    </article>
  )
}
