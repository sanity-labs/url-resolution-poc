import type {SanityClient} from '@sanity/client'

/**
 * A redirect entry formatted for framework integration.
 *
 * The shape matches Next.js `redirects()` config directly. For other frameworks
 * (Remix, SvelteKit), a light transform may be needed \u2014 e.g., Remix uses
 * `{ path, redirect, status }` and SvelteKit uses `{ from, to, status }`.
 *
 * @example
 * ```ts
 * // next.config.js \u2014 use directly
 * import { getRedirects } from '@sanity/routes'
 * import { createClient } from '@sanity/client'
 *
 * const client = createClient({ projectId: 'your-id', dataset: 'production', apiVersion: '2024-01-01', useCdn: true })
 * export default {
 *   async redirects() {
 *     return getRedirects(client)
 *   }
 * }
 *
 * // Remix \u2014 transform
 * const redirects = await getRedirects(client)
 * const remixRedirects = redirects.map(r => ({
 *   path: r.source,
 *   redirect: r.destination,
 *   status: r.statusCode,
 * }))
 * ```
 */
export interface FrameworkRedirect {
  /** The source path to redirect from (e.g., `/blog/old-slug`). */
  source: string
  /** The destination path to redirect to (e.g., `/blog/new-slug`). */
  destination: string
  /** Whether this is a permanent redirect (301 or 308). */
  permanent: boolean
  /** The HTTP status code (301, 302, 307, or 308). */
  statusCode: number
}

/**
 * Fetch all redirects from Sanity and return them in a format
 * compatible with Next.js `redirects()` in `next.config.js`.
 *
 * For sites with fewer than 2,000 redirects, this enables zero-middleware,
 * edge-served redirects compiled into the routing table at build time.
 *
 * @param client - A Sanity client (CDN recommended for build-time use).
 * @param options - Optional filtering options.
 * @returns Array of redirect objects ready for `next.config.js` `redirects()`.
 *
 * @example
 * ```ts
 * // next.config.js
 * import { getRedirects } from '@sanity/routes'
 * import { client } from './src/sanity/lib/client'
 *
 * export default {
 *   async redirects() {
 *     return getRedirects(client)
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // Filter by source type
 * const autoOnly = await getRedirects(client, { source: 'auto' })
 * const manualOnly = await getRedirects(client, { source: 'manual' })
 * ```
 */
export async function getRedirects(
  client: SanityClient,
  options?: {source?: 'auto' | 'manual'},
): Promise<FrameworkRedirect[]> {
  const filter = options?.source
    ? `*[_type == "routes.redirect" && source == $source]`
    : `*[_type == "routes.redirect"]`

  const params = options?.source ? {source: options.source} : {}

  const redirects = await client.fetch<
    Array<{from: string; to: string; statusCode: string}>
  >(`${filter} | order(from asc) { from, to, statusCode }`, params)

  return redirects.map((r) => {
    const code = Number(r.statusCode) || 301
    return {
      source: r.from,
      destination: r.to,
      permanent: code === 301 || code === 308,
      statusCode: code,
    }
  })
}
