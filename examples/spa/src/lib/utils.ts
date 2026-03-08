import { getPath } from '@sanity/routes'

/**
 * Resolve a document ID to its pathname using the URL map.
 * Returns '#' if the document has no resolved URL.
 */
export function getPathById(
  id: string,
  urlMap: Record<string, string>,
): string {
  const url = urlMap[id]
  if (!url) return '#'
  return getPath(url) ?? url
}
