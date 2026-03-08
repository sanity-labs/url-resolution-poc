import { createFileRoute } from '@tanstack/react-router'
import { fetchBlogPost } from '~/lib/server-fns'
import { PortableTextBody } from '~/components/PortableTextBody'

export const Route = createFileRoute('/blog/$slug')(
  {
    loader: ({ params }) => fetchBlogPost({ data: params.slug }),
    component: BlogPost,
    notFoundComponent: () => <h1>Blog post not found</h1>,
  },
)

function BlogPost() {
  const { post, urlMap } = Route.useLoaderData()

  if (!post) {
    return <h1>Blog post not found</h1>
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <PortableTextBody value={post.body} urlMap={urlMap} />
    </article>
  )
}
