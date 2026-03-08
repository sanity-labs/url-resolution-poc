import { sanityFetch } from '@/lib/live'
import { resolver } from '@/lib/routes'

export default async function Home() {
  const [{ data: articles }, { data: posts }, urlMap] = await Promise.all([
    sanityFetch({ query: `*[_type == "article"] | order(title asc) { _id, title }` }),
    sanityFetch({ query: `*[_type == "blogPost"] | order(title asc) { _id, title }` }),
    resolver.preload(),
  ])

  const getPath = (id: string) => {
    const url = urlMap[id]
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
          {(articles as Array<{_id: string; title: string | null}>).map((a) => (
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
          {(posts as Array<{_id: string; title: string | null}>).map((p) => (
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
