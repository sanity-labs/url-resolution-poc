/**
 * Normalize a URL path - collapse double slashes, ensure leading slash, no trailing slash.
 *
 * @internal Used by the redirect Function. Not part of the public API.
 * @param path - Raw path string
 * @returns Normalized path
 *
 * @example
 * ```ts
 * normalizePath('/blog//old-slug/') // -> '/blog/old-slug'
 * normalizePath('blog/post')        // -> '/blog/post'
 * ```
 */
export function normalizePath(path: string): string {
  return ('/' + path).replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

/**
 * Create a deterministic redirect document ID from a source path.
 *
 * @internal Used by the redirect Function. Not part of the public API.
 * @param path - The source path (e.g., `/blog/old-slug`)
 * @returns A Sanity document ID (e.g., `redirect-blog-old-slug`)
 *
 * @example
 * ```ts
 * slugifyRedirectId('/blog/old-slug') // -> 'redirect-blog-old-slug'
 * ```
 */
export function slugifyRedirectId(path: string): string {
  return (
    'redirect-' +
    path
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/[^a-z0-9-]/gi, '')
  )
}
