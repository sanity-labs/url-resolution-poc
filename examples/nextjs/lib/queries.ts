import { defineQuery } from 'next-sanity'

// ─── Static queries (TypeGen generates result types) ────────────────────────

export const BLOG_POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "blogPost" && slug.current == $slug][0]{
    _id, title, body
  }
`)

export const ARTICLE_BY_SLUG_QUERY = defineQuery(`
  *[_type == "article" && slug.current == $lastSlug][0]{
    _id, title, body
  }
`)

// ─── Dynamic queries (groqField() — TypeGen can't infer these) ─────────────
// The homepage queries use groqField() which generates GROQ at runtime based
// on route configuration. TypeGen can't analyze dynamic queries, so we define
// manual types for the results.

/** Result type for articles listed on the homepage (with resolved path) */
export type ArticleListItem = {
  _id: string
  title: string | null
  path: string | null
}

/** Result type for blog posts listed on the homepage (with resolved path) */
export type BlogPostListItem = {
  _id: string
  title: string | null
  path: string | null
}
