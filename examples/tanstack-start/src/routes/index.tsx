import { createFileRoute } from '@tanstack/react-router'
import { fetchHomeData } from '~/lib/server-fns'
import { getPath } from '@sanity/routes'

export const Route = createFileRoute('/')(
  {
    loader: () => fetchHomeData(),
    component: Home,
  },
)

function Home() {
  const { articles, posts, urlMap } = Route.useLoaderData()

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
        TanStack Start edition.
      </p>

      <section>
        <h2>Articles</h2>
        <ul>
          {articles.map((a) => (
            <li key={a._id}>
              <a href={getPathById(a._id)}>{a.title}</a>
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
              <a href={getPathById(p._id)}>{p.title}</a>
              <code> → {getPathById(p._id)}</code>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
