import type {SanityClient} from '@sanity/client'

/**
 * A redirect entry formatted for framework integration.
 *
 * The shape matches Next.js `redirects()` config directly. For other frameworks
 * (Remix, SvelteKit), a light transform may be needed — e.g., Remix uses
 * `{ path, redirect, status }` and SvelteKit uses `{ from, to, status }`.
 *
 * @example
 * ```ts
 * // next.config.js — use directly
 * import { createClient } from '@sanity/client'
 * import { getRedirects } from '@sanity/routes'
 *
 * const client = createClient({ projectId: 'your-id', dataset: 'production', apiVersion: '2024-01-01', useCdn: true })
 * export default {
 *   async redirects() {
 *     return getRedirects(client)
 *   }
 * }
 *
 * // Remix — transform
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

/** Options for {@link getRedirects}. */
export interface GetRedirectsOptions {
  /** Filter by redirect source: `'auto'` (slug changes) or `'manual'` (editor-created). */
  source?: 'auto' | 'manual'

  /**
   * Cache TTL in milliseconds. When set, results are cached in memory and
   * returned from cache until the TTL expires.
   *
   * Use this in server hooks or middleware where `getRedirects()` is called
   * on every request. Without caching, each request triggers a Sanity API call.
   *
   * @example
   * ```ts
   * // SvelteKit hooks.server.ts — cached for 60 seconds
   * const redirects = await getRedirects(client, { cacheTtl: 60_000 })
   *
   * // Next.js next.config.js — no cache needed (runs at build time)
   * const redirects = await getRedirects(client)
   * ```
   */
  cacheTtl?: number
}

// ─── Module-scoped cache ──────────────────────────────────────────────
interface CacheEntry {
  data: FrameworkRedirect[]
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

function getCacheKey(client: SanityClient, source?: string): string {
  const config = client.config()
  return `${config.projectId}:${config.dataset}:${source || 'all'}`
}

/** @internal Clear the redirect cache. For testing only. */
export function _clearRedirectCache(): void {
  cache.clear()
}

/**
 * Fetch all redirects from Sanity and return them in a format
 * compatible with Next.js `redirects()` in `next.config.js`.
 *
 * For sites with fewer than 2,000 redirects, this enables zero-middleware,
 * edge-served redirects compiled into the routing table at build time.
 *
 * When called in server hooks or middleware (every request), use `cacheTtl`
 * to avoid repeated API calls:
 *
 * ```ts
 * // Cached — one API call per 60 seconds
 * const redirects = await getRedirects(client, { cacheTtl: 60_000 })
 * ```
 *
 * @param client - A Sanity client (CDN recommended for build-time use).
 * @param options - Optional filtering and caching options.
 * @returns Array of redirect objects ready for `next.config.js` `redirects()`.
 *
 * @example
 * ```ts
 * // next.config.js — build-time, no cache needed
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
 * // SvelteKit hooks.server.ts — runtime, cached
 * import { getRedirects } from '@sanity/routes'
 * import { client } from '$lib/sanity'
 *
 * export const handle = async ({ event, resolve }) => {
 *   const redirects = await getRedirects(client, { cacheTtl: 60_000 })
 *   const match = redirects.find(r => r.source === event.url.pathname)
 *   if (match) throw redirect(match.statusCode, match.destination)
 *   return resolve(event)
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
  options?: GetRedirectsOptions,
): Promise<FrameworkRedirect[]> {
  const {source, cacheTtl} = options || {}

  // Check cache
  if (cacheTtl !== undefined && cacheTtl > 0) {
    const key = getCacheKey(client, source)
    const cached = cache.get(key)
    if (cached && Date.now() - cached.fetchedAt < cacheTtl) {
      return cached.data
    }
  }

  const filter = source
    ? `*[_type == "routes.redirect" && source == $source]`
    : `*[_type == "routes.redirect"]`

  const params = source ? {source} : {}

  const redirects = await client.fetch<
    Array<{from: string; to: string; statusCode: string}>
  >(`${filter} | order(from asc) { from, to, statusCode }`, params)

  const result = redirects.map((r) => {
    const code = Number(r.statusCode) || 301
    return {
      source: r.from,
      destination: r.to,
      permanent: code === 301 || code === 308,
      statusCode: code,
    }
  })

  // Store in cache
  if (cacheTtl !== undefined && cacheTtl > 0) {
    const key = getCacheKey(client, source)
    cache.set(key, {data: result, fetchedAt: Date.now()})
  }

  return result
}
