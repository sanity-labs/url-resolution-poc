/**
 * Extract the pathname from a full URL string.
 *
 * Convenience utility for use with URLs from {@link RouteResolver.resolveUrlById}
 * or from a `preload()` Map.
 *
 * @param url - A full URL string (e.g., `"https://example.com/docs/setup"`)
 * @returns The pathname portion (e.g., `"/docs/setup"`), or `null` if the URL is invalid.
 *
 * @example
 * ```ts
 * import { getPath } from '@sanity/routes'
 *
 * const urlMap = await resolver.preload()
 * for (const [id, url] of urlMap) {
 *   const path = getPath(url)
 *   // → "/blog/hello-world"
 * }
 * ```
 */
export function getPath(url: string): string | null {
  try {
    return new URL(url).pathname
  } catch {
    return null
  }
}
