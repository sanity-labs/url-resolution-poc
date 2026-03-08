import { useLoaderData } from 'react-router'
import type { PortableTextProps } from '@portabletext/react'
import PortableTextBody from '../components/PortableTextBody'

export default function BlogPost() {
  const { post, urlMap } = useLoaderData() as {
    post: { _id: string; title: string | null; body: PortableTextProps['value'] | null }
    urlMap: Record<string, string>
  }

  return (
    <article>
      <h1>{post.title}</h1>
      {post.body && <PortableTextBody value={post.body} urlMap={urlMap} />}
    </article>
  )
}
