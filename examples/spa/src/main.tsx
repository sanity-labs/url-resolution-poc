import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, redirect } from 'react-router'
import { client } from './lib/sanity'
import { resolver } from './lib/routes'
import { getRedirects } from '@sanity/routes'
import { ARTICLES_QUERY, BLOG_POSTS_QUERY, BLOG_POST_BY_SLUG_QUERY, ARTICLE_BY_SLUG_QUERY } from './lib/queries'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './routes/Home'
import BlogPost from './routes/BlogPost'
import Article from './routes/Article'

/**
 * Client-side redirect check.
 * Runs on every navigation via the root loader.
 * Uses cacheTtl to avoid re-fetching on every route change.
 */
async function checkRedirect(request: Request) {
  const url = new URL(request.url)
  const redirects = await getRedirects(client, { cacheTtl: 60_000 })
  const match = redirects.find((r) => r.source === url.pathname)
  if (match) {
    return redirect(match.destination)
  }
  return null
}

const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    ErrorBoundary: ErrorBoundary,
    loader: async ({ request }) => {
      const redirectResult = await checkRedirect(request)
      if (redirectResult) return redirectResult
      return null
    },
    children: [
      {
        index: true,
        Component: Home,
        loader: async () => {
          const [articles, posts, urlMap] = await Promise.all([
            client.fetch(ARTICLES_QUERY),
            client.fetch(BLOG_POSTS_QUERY),
            resolver.preload(),
          ])
          return { articles, posts, urlMap }
        },
      },
      {
        path: 'blog/:slug',
        Component: BlogPost,
        loader: async ({ params }) => {
          const [post, urlMap] = await Promise.all([
            client.fetch(BLOG_POST_BY_SLUG_QUERY, { slug: params.slug }),
            resolver.preload(),
          ])
          if (!post) throw new Response('Not Found', { status: 404 })
          return { post, urlMap }
        },
      },
      {
        path: 'docs/*',
        Component: Article,
        loader: async ({ params }) => {
          const segments = (params['*'] || '').split('/')
          const lastSlug = segments[segments.length - 1]
          const [article, urlMap] = await Promise.all([
            client.fetch(ARTICLE_BY_SLUG_QUERY, { slug: lastSlug }),
            resolver.preload(),
          ])
          if (!article) throw new Response('Not Found', { status: 404 })
          return { article, urlMap }
        },
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
