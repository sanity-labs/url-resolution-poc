import { createServerFn } from '@tanstack/react-start'
import { client } from './sanity'
import { resolver } from './routes'
import { getRedirects } from '@sanity/routes'
import {
  ARTICLES_QUERY,
  BLOG_POSTS_QUERY,
  BLOG_POST_BY_SLUG_QUERY,
  ARTICLE_BY_SLUG_QUERY,
} from './queries'

/**
 * Fetch all articles and blog posts with their resolved URLs.
 * Runs on the server to keep the Sanity token secure.
 */
export const fetchHomeData = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [articles, posts, urlMap] = await Promise.all([
      client.fetch(ARTICLES_QUERY),
      client.fetch(BLOG_POSTS_QUERY),
      resolver.preload(),
    ])
    return { articles, posts, urlMap }
  },
)

/**
 * Fetch a blog post by slug with URL map for PT internal links.
 */
export const fetchBlogPost = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const [post, urlMap] = await Promise.all([
      client.fetch(BLOG_POST_BY_SLUG_QUERY, { slug }),
      resolver.preload(),
    ])
    return { post, urlMap }
  })

/**
 * Fetch a docs article by slug with URL map for PT internal links.
 */
export const fetchArticle = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const [article, urlMap] = await Promise.all([
      client.fetch(ARTICLE_BY_SLUG_QUERY, { slug }),
      resolver.preload(),
    ])
    return { article, urlMap }
  })

/**
 * Fetch all resolved URLs for sitemap generation.
 */
export const fetchSitemapUrls = createServerFn({ method: 'GET' }).handler(
  async () => {
    const urlMap = await resolver.preload()
    return Object.values(urlMap)
  },
)

/**
 * Check for redirects. Uses cacheTtl to avoid hitting Sanity on every request.
 */
export const checkRedirect = createServerFn({ method: 'GET' })
  .validator((pathname: string) => pathname)
  .handler(async ({ data: pathname }) => {
    const redirects = await getRedirects(client, { cacheTtl: 60_000 })
    const match = redirects.find((r) => r.source === pathname)
    return match || null
  })
