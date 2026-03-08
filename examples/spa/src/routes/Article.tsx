import { useLoaderData } from 'react-router'
import type { PortableTextProps } from '@portabletext/react'
import PortableTextBody from '../components/PortableTextBody'

export default function Article() {
  const { article, urlMap } = useLoaderData() as {
    article: { _id: string; title: string | null; body: PortableTextProps['value'] | null }
    urlMap: Record<string, string>
  }

  return (
    <article>
      <h1>{article.title}</h1>
      {article.body && <PortableTextBody value={article.body} urlMap={urlMap} />}
    </article>
  )
}
