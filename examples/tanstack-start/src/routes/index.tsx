import { createFileRoute } from '@tanstack/react-router'
import { fetchHomeData } from '~/lib/server-fns'

export const Route = createFileRoute('/')(
  {
    loader: () => fetchHomeData(),
    component: Home,
  },
)

function Home() {
  const { articles, posts, urlMap } = Route.useLoaderData()

  function getPath(id: string): string {
    const url = urlMap[id]
    if (!url) return '#'
    try {
      return new URL(url).pathname
    } catch {
      return url
    }
  }

  return (
    <>
      <h1>URL Resolution POC</h1>
      <p>
        Proving two-tier URL resolution for Sanity structured content —
        TanStack Start edition.
      </p>

      <section>
        <h2>Articles</h2>
        <ul>
          {articles.map((a) => (
            <li key={a._id}>
              <a href={getPath(a._id)}>{a.title}</a>
              <code> → {getPath(a._id)}</code>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Blog Posts</h2>
        <ul>
          {posts.map((p) => (
            <li key={p._id}>
              <a href={getPath(p._id)}>{p.title}</a>
              <code> → {getPath(p._id)}</code>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
