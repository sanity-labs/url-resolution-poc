import { sanityFetch } from '@/lib/live'
import { realtimeResolver } from '@/lib/routes'
import type { ArticleListItem, BlogPostListItem } from '@/lib/queries'

export default async function Home() {
  // groqField() generates GROQ at runtime based on route configuration.
  // TypeGen can't analyze dynamic queries, so we use manual types instead.
  const articleField = await realtimeResolver.groqField('article')
  const blogField = await realtimeResolver.groqField('blogPost')

  const { data: articles } = await sanityFetch({
    query: `*[_type == "article"] | order(title asc) { _id, title, ${articleField} }`,
  })
  const { data: posts } = await sanityFetch({
    query: `*[_type == "blogPost"] | order(title asc) { _id, title, ${blogField} }`,
  })

  return (
    <main>
      <h1>URL Resolution POC</h1>
      <p>Proving two-tier URL resolution for Sanity structured content.</p>

      <section>
        <h2>Articles</h2>
        <ul>
          {(articles as ArticleListItem[]).map((a) => (
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
          {(posts as BlogPostListItem[]).map((p) => (
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
