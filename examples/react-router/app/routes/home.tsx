import type { Route } from './+types/home'
import { client } from '~/lib/sanity.server'
import { resolver } from '~/lib/routes.server'
import { ARTICLES_QUERY, BLOG_POSTS_QUERY } from '~/lib/queries'
import { getPath } from '@sanity/routes'

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

  function getPathById(id: string): string {
    const url = urlMap[id]
    if (!url) return '#'
    return getPath(url) ?? url
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
