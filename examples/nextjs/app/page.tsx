import { sanityFetch } from '@/lib/live'
import { resolver, realtimeResolver } from '@/lib/routes'
import type { ArticleListItem, BlogPostListItem } from '@/lib/queries'

export default async function Home() {
  // groqField() generates GROQ at runtime based on route configuration.
  // TypeGen can't analyze dynamic queries, so we use manual types instead.
  const articleField = await realtimeResolver.groqField('article')
  const blogField = await realtimeResolver.groqField('blogPost')

  const [{ data: articles }, { data: posts }, urlMap] = await Promise.all([
    sanityFetch({ query: `*[_type == "article"] | order(title asc) { _id, title, ${articleField} }` }),
    sanityFetch({ query: `*[_type == "blogPost"] | order(title asc) { _id, title, ${blogField} }` }),
    resolver.preload(),
  ])

  const getPath = (id: string) => {
    const url = urlMap.get(id)
    if (!url) return '#'
    try { return new URL(url).pathname } catch { return url }
  }

  return (
    <main>
      <h1>URL Resolution POC</h1>
      <p>Proving two-tier URL resolution for Sanity structured content.</p>

      <section>
        <h2>Articles</h2>
        <ul>
          {(articles as ArticleListItem[]).map((a) => (
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
          {(posts as BlogPostListItem[]).map((p) => (
            <li key={p._id}>
              <a href={getPath(p._id)}>{p.title}</a>
              <code> → {getPath(p._id)}</code>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
