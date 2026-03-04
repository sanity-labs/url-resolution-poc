import { PortableText } from '@portabletext/react'
import { sanityFetch } from '@/lib/live'
import { resolver } from '@/lib/routes'
import { CodeBlock } from '@/components/CodeBlock'
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
      {post.body && (
        <PortableText
          value={post.body}
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
