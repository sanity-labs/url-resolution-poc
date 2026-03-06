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
