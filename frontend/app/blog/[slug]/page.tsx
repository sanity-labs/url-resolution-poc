import { PortableText } from '@portabletext/react'
import { draftMode } from 'next/headers'
import { client } from '@/lib/sanity'
import { resolver } from '@/lib/routes'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const draft = await draftMode()
  const pageClient = draft.isEnabled
    ? client.withConfig({ perspective: 'drafts', useCdn: false })
    : client

  const post = await pageClient.fetch(
    `*[_type == "blogPost" && slug.current == $slug][0]{
      _id, title, body
    }`,
    { slug }
  )

  if (!post) {
    return <h1>Blog post not found</h1>
  }

  // Pre-load all route map shards for synchronous PT link resolution
  const urlMap = await resolver.preload()

  return (
    <article>
      <nav><a href="/">← Home</a></nav>
      <h1>{post.title}</h1>
      {post.body && (
        <PortableText
          value={post.body}
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
