/**
 * Default GROQ expression used to resolve a document's URL path segment.
 * Falls back to `slug.current` when no `pathExpression` is configured on a route entry.
 *
 * @internal
 */
export const DEFAULT_PATH_EXPRESSION = 'slug.current'
