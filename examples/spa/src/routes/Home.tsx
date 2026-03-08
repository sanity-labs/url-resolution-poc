import { Link, useLoaderData } from 'react-router'
import { getPath } from '@sanity/routes'

export default function Home() {
  const { articles, posts, urlMap } = useLoaderData() as {
    articles: Array<{ _id: string; title: string | null }>
    posts: Array<{ _id: string; title: string | null }>
    urlMap: Record<string, string>
  }

  function getPathById(id: string): string {
    const url = urlMap[id]
    if (!url) return '#'
    return getPath(url) ?? url
  }

  return (
    <>
      <h1>URL Resolution POC</h1>
      <p>
        Proving two-tier URL resolution for Sanity structured content —
        SPA edition (client-side only, no SSR).
      </p>

      <section>
        <h2>Articles</h2>
        <ul>
          {articles.map((a) => (
            <li key={a._id}>
              <Link to={getPathById(a._id)}>{a.title}</Link>
              <code> → {getPathById(a._id)}</code>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Blog Posts</h2>
        <ul>
          {posts.map((p) => (
            <li key={p._id}>
              <Link to={getPathById(p._id)}>{p.title}</Link>
              <code> → {getPathById(p._id)}</code>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
