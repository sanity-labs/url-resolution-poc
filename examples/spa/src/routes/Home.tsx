import { Link, useLoaderData } from 'react-router'
import { getPathById } from '../lib/utils'

export default function Home() {
  const { articles, posts, urlMap } = useLoaderData() as {
    articles: Array<{ _id: string; title: string | null }>
    posts: Array<{ _id: string; title: string | null }>
    urlMap: Record<string, string>
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
              <Link to={getPathById(a._id, urlMap)}>{a.title}</Link>
              <code> → {getPathById(a._id, urlMap)}</code>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Blog Posts</h2>
        <ul>
          {posts.map((p) => (
            <li key={p._id}>
              <Link to={getPathById(p._id, urlMap)}>{p.title}</Link>
              <code> → {getPathById(p._id, urlMap)}</code>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
