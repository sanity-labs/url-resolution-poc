import type { Route } from './+types/home'
import { client } from '~/lib/sanity.server'
import { resolver } from '~/lib/routes.server'
import { ARTICLES_QUERY, BLOG_POSTS_QUERY } from '~/lib/queries'

export async function loader() {
  const [articles, posts, urlMap] = await Promise.all([
    client.fetch(ARTICLES_QUERY),
    client.fetch(BLOG_POSTS_QUERY),
    resolver.preload(),
  ])

  // React Router uses JSON serialization — Map doesn't serialize.
  // Convert to plain object for the loader→component boundary.
  return { articles, posts, urlMap }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { articles, posts, urlMap } = loaderData

  function getPath(id: string): string {
    const url = urlMap[id]
    if (!url) return '#'
    try { return new URL(url).pathname } catch { return url }
  }

  return (
    <>
      <h1>URL Resolution POC</h1>
      <p>Proving two-tier URL resolution for Sanity structured content — React Router edition.</p>

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
