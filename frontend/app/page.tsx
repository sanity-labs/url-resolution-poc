import { client } from '@/lib/sanity'
import { realtimeResolver } from '@/lib/routes'

export default async function Home() {
  // Get the groqField for each type (realtime mode — live pathExpression)
  const articleField = await realtimeResolver.groqField('article')
  const blogField = await realtimeResolver.groqField('blogPost')

  const [articles, posts] = await Promise.all([
    client.fetch(`*[_type == "article"] | order(title asc) { _id, title, ${articleField} }`),
    client.fetch(`*[_type == "blogPost"] | order(title asc) { _id, title, ${blogField} }`),
  ])

  return (
    <main>
      <h1>URL Resolution POC</h1>
      <p>Proving two-tier URL resolution for Sanity structured content.</p>

      <section>
        <h2>Articles</h2>
        <ul>
          {articles.map((a: any) => (
            <li key={a._id}>
              <a href={`/docs/${a.path}`}>{a.title}</a>
              <code> → /docs/{a.path}</code>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Blog Posts</h2>
        <ul>
          {posts.map((p: any) => (
            <li key={p._id}>
              <a href={`/blog/${p.path}`}>{p.title}</a>
              <code> → /blog/{p.path}</code>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
