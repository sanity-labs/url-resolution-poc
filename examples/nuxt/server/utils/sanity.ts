/**
 * Re-export the Sanity client from @nuxtjs/sanity module.
 * Keeps the same `useSanityClient()` API used by routes.ts and redirects.ts,
 * but delegates to the module's pre-configured client instead of creating our own.
 */
export function useSanityClient() {
  return useSanity().client
}
