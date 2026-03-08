import { sanityFetch } from '@/lib/live'
import { resolver } from '@/lib/routes'
import { getPath } from '@sanity/routes'
import { ARTICLES_QUERY, BLOG_POSTS_QUERY } from '@/lib/queries'

export default async function Home() {
  const [{ data: articles }, { data: posts }, urlMap] = await Promise.all([
    sanityFetch({ query: ARTICLES_QUERY }),
    sanityFetch({ query: BLOG_POSTS_QUERY }),
    resolver.preload(),
  ])

  function getPathById(id: string): string {
    const url = urlMap[id]
    if (!url) return '#'
    return getPath(url) ?? url
  }

  return (
    <main>
      <h1>URL Resolution POC</h1>
      <p>Proving two-tier URL resolution for Sanity structured content.</p>

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
    </main>
  )
}
