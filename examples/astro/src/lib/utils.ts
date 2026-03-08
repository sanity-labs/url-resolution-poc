/**
 * Extract the pathname from a full URL.
 * Falls back to returning the input if it's already a path.
 */
export function getPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

/**
 * Resolve a document ID to its pathname using the URL map.
 */
export function getPathById(
  id: string,
  urlMap: Record<string, string>,
): string {
  const url = urlMap[id]
  if (!url) return '#'
  return getPath(url)
}

/**
 * Escape a string for safe inclusion in XML.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
