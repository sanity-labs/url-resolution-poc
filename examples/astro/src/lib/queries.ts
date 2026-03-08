import { defineQuery } from 'groq'

export const ARTICLES_QUERY = defineQuery(
  `*[_type == "article"] | order(title asc) { _id, title }`,
)

export const BLOG_POSTS_QUERY = defineQuery(
  `*[_type == "blogPost"] | order(title asc) { _id, title }`,
)

export const BLOG_POST_BY_SLUG_QUERY = defineQuery(
  `*[_type == "blogPost" && slug.current == $slug][0]{ _id, title, body }`,
)

export const ARTICLE_BY_SLUG_QUERY = defineQuery(
  `*[_type == "article" && slug.current == $slug][0]{ _id, title, body }`,
)
