import type {SanityClient} from '@sanity/client'

/**
 * Route configuration document stored in Content Lake.
 *
 * Each config represents a "channel" (e.g., "web", "app") and defines
 * how document types map to URLs. Created in Sanity Studio or via seed script.
 *
 * @example
 * ```ts
 * // Minimal config for a blog
 * const config: RoutesConfig = {
 *   _id: 'routes-config-web',
 *   _type: 'routes.config',
 *   channel: 'web',
 *   baseUrls: [{ name: 'production', url: 'https://example.com', isDefault: true }],
 *   routes: [{ types: ['blogPost'], basePath: '/blog' }],
 * }
 * ```
 */
export interface RoutesConfig {
  _id: string
  _type: 'routes.config'
  channel: string
  isDefault?: boolean
  baseUrls: BaseUrlEntry[]
  routes: RouteEntry[]
}

/**
 * A named base URL for environment-specific URL resolution.
 *
 * Multiple entries allow the same route config to produce different URLs
 * per environment (production, staging, preview).
 *
 * @example
 * ```ts
 * const baseUrls: BaseUrlEntry[] = [
 *   { name: 'production', url: 'https://example.com', isDefault: true },
 *   { name: 'staging', url: 'https://staging.example.com' },
 *   { name: 'preview', url: 'https://preview.example.com' },
 * ]
 * ```
 */
export interface BaseUrlEntry {
  _key?: string
  name: string
  url: string
  isDefault?: boolean
}

/**
 * Maps one or more document types to a URL path pattern.
 *
 * Each entry defines how documents of the specified types resolve to URLs
 * under a given `basePath`. The `pathExpression` is a GROQ expression
 * evaluated against each document to produce the path segment.
 *
 * @example
 * ```ts
 * // Simple slug-based route
 * const blogRoute: RouteEntry = {
 *   types: ['blogPost'],
 *   basePath: '/blog',
 *   // pathExpression defaults to 'slug.current'
 * }
 *
 * // Parent-child route with custom path expression
 * const docsRoute: RouteEntry = {
 *   types: ['article'],
 *   basePath: '/docs',
 *   pathExpression: '*[_type == "section" && references(^._id)][0].slug.current + "/" + slug.current',
 *   mode: 'parentSlug',
 *   parentType: 'section',
 * }
 *
 * // i18n route with locale-specific slugs
 * const productRoute: RouteEntry = {
 *   types: ['product'],
 *   basePath: '/products',
 *   pathExpression: 'slug[_key == $locale][0].value',
 *   locales: ['en', 'fr', 'de'],
 * }
 * ```
 */
export interface RouteEntry {
  _key?: string
  /** Document type names that this route handles. */
  types: string[]
  /** URL path prefix. Leading slash added automatically if missing. Example: `/blog` */
  basePath: string
  /**
   * GROQ expression evaluated per document to produce the URL path segment.
   * Defaults to `slug.current`. The variable `$locale` is available when
   * locales are configured.
   */
  pathExpression?: string
  /** Per-route base URL overrides. Takes precedence over channel-level baseUrls. */
  baseUrls?: BaseUrlEntry[]
  /**
   * Supported locales for this route. When set, separate route map shards
   * are created per locale (e.g., `routes-web-product-en`).
   */
  locales?: string[]
  /** Route mode hint for Studio UI. Does not affect resolver behavior. */
  mode?: 'simpleSlug' | 'parentSlug' | 'custom'
  /** Field name for the slug. Defaults to `'slug'`. Used by Studio components. */
  slugField?: string
  /** Parent document type for `parentSlug` mode. */
  parentType?: string
  /** Slug field on the parent document. Defaults to `'slug'`. */
  parentSlugField?: string
  /**
   * How parent and child documents are related.
   * `'parentReferencesChild'`: parent has reference array to children.
   * `'childReferencesParent'`: child has reference to parent.
   */
  parentRelationship?: 'parentReferencesChild' | 'childReferencesParent'
  /** Reference field name on the parent document. */
  parentReferenceField?: string
}

/**
 * Pre-computed route map shard stored in Content Lake.
 *
 * Each shard contains all URL entries for a single document type in a channel.
 * Shards are created by `buildRouteMap()` or the sync Function handler.
 * Used by the static resolver for fast lookups without GROQ evaluation.
 *
 * Shard IDs follow the convention `routes-{channel}-{type}` (or
 * `routes-{channel}-{type}-{locale}` for i18n routes).
 */
export interface RouteMapShard {
  _id: string
  _type: 'routes.map'
  channel: string
  documentType: string
  basePath: string
  entries: RouteMapEntry[]
}

/**
 * A single document-to-path mapping within a route map shard.
 */
export interface RouteMapEntry {
  _key?: string
  /** Weak reference to the source document. */
  doc: {_ref: string; _type: 'reference'; _weak?: boolean}
  /** Resolved URL path segment (without basePath or baseUrl). */
  path: string
}

/**
 * Options for locale-aware URL resolution.
 *
 * When passed to resolver methods, the `locale` value is available as
 * `$locale` in GROQ pathExpression evaluation.
 *
 * @example
 * ```ts
 * const url = await resolver.resolveUrlById('product-123', { locale: 'fr' })
 * ```
 */
export interface LocaleOptions {
  /** Locale to use when evaluating pathExpression (available as `$locale` in GROQ). */
  locale?: string
}

/**
 * Status codes returned by {@link BaseRouteResolver.diagnose}.
 *
 * - `'resolved'` — URL resolved successfully
 * - `'document_not_found'` — No document exists with this ID
 * - `'no_route_entry'` — Document exists but its type has no route config
 * - `'empty_path'` — Route matched but pathExpression evaluated to null/empty
 * - `'no_config'` — No route config document found for the channel
 * - `'shard_not_found'` — (Static mode only) Route entry exists but no shard has been built yet
 *
 * @experimental The status set may evolve.
 */
export type DiagnosisStatus =
  | 'resolved'
  | 'document_not_found'
  | 'no_route_entry'
  | 'empty_path'
  | 'no_config'
  | 'shard_not_found'

/**
 * Detailed diagnosis of why a document ID resolved (or failed to resolve) to a URL.
 *
 * Use {@link BaseRouteResolver.diagnose} to get this result. The `message` field
 * contains a human-readable explanation suitable for logging.
 *
 * @example
 * ```ts
 * const result = await resolver.diagnose('my-doc')
 * if (result.status !== 'resolved') {
 *   console.warn(result.message)
 *   // "No route entry for type "article". Available routable types: blogPost, page."
 * }
 * ```
 *
 * @experimental The result shape may evolve.
 */
export interface DiagnosisResult {
  /** Diagnosis status code. */
  status: DiagnosisStatus
  /** The document ID that was diagnosed. */
  documentId: string
  /** The document's type, if it was found. */
  documentType?: string
  /** The resolved URL, only present when status is `'resolved'`. */
  url?: string
  /** List of routable types, present when status is `'no_route_entry'`. */
  availableRoutes?: string[]
  /** Human-readable explanation suitable for logging or error reporting. */
  message: string
}

/**
 * Shared interface for all route resolver methods.
 *
 * Both {@link RealtimeRouteResolver} and {@link StaticRouteResolver} extend this
 * interface. Use the `mode` property to discriminate between them at runtime.
 *
 * @see {@link createRouteResolver} to create a resolver instance
 */
export interface BaseRouteResolver {
  /**
   * Resolve a single document ID to its full URL.
   *
   * @param id - Published document ID to resolve. Use `@sanity/id-utils` to normalize draft/version IDs.
   * @param options - Locale options for i18n routes
   * @returns The full URL including base URL and basePath, or `null` if the document
   *   can't be resolved (missing document, no route entry, or empty path).
   *   Use {@link diagnose} to determine the specific failure reason.
   *
   * @example
   * ```ts
   * const url = await resolver.resolveUrlById('article-123')
   * // → 'https://example.com/docs/getting-started'
   * ```
   *
   * @see {@link diagnose} for debugging null returns
   * @see {@link resolveUrlByIds} for batch resolution
   */
  resolveUrlById(id: string, options?: LocaleOptions): Promise<string | null>

  /**
   * Resolve multiple document IDs to their full URLs in a single batch.
   *
   * More efficient than calling {@link resolveUrlById} in a loop — groups
   * documents by route entry for batch GROQ evaluation.
   *
   * @param ids - Array of published document IDs to resolve
   * @param options - Locale options for i18n routes
   * @returns Map of document ID → full URL. IDs that can't be resolved are omitted (not null).
   *
   * @example
   * ```ts
   * const urls = await resolver.resolveUrlByIds(['blog-1', 'blog-2', 'article-1'])
   * urls.get('blog-1')    // → 'https://example.com/blog/hello-world'
   * urls.get('article-1') // → 'https://example.com/docs/setup'
   * urls.get('missing')   // → undefined
   * ```
   */
  resolveUrlByIds(ids: string[], options?: LocaleOptions): Promise<Map<string, string>>

  /**
   * Returns a GROQ projection expression for the path portion of a route.
   *
   * The returned expression resolves to the relative path only — it does NOT
   * include baseUrl or basePath. Use this to embed URL resolution directly
   * in GROQ queries.
   *
   * @param type - Document type name (e.g., `'blogPost'`)
   * @returns A GROQ projection string like `"path": slug.current`
   * @throws If no route entry exists for the given type
   *
   * @example
   * ```ts
   * const pathExpr = await resolver.groqField('blogPost')
   * const posts = await client.fetch(
   *   `*[_type == "blogPost"]{ _id, title, ${pathExpr} }`
   * )
   * // → [{ _id: "blog-1", title: "Hello", path: "hello-world" }]
   * ```
   */
  groqField(type: string): Promise<string>

  /**
   * List all document types that have route entries in the config.
   *
   * @returns Array of document type names (e.g., `['blogPost', 'article', 'product']`)
   */
  getRoutableTypes(): Promise<string[]>

  /**
   * Generate GROQ custom function declarations for all routable types.
   *
   * Each declaration creates a `routes::{type}Path($id)` function that looks up
   * the path from the route map shard. Useful for embedding route resolution
   * in GROQ queries without client-side processing.
   *
   * @returns Newline-separated function declarations
   *
   * @example
   * ```ts
   * const fns = await resolver.groqFunctions()
   * // → 'fn routes::blogPostPath($id) = *[_id == "routes-web-blogPost"][0].entries[doc._ref == $id][0].path;'
   * ```
   *
   * @experimental GROQ custom functions may not be supported in all environments.
   */
  groqFunctions(): Promise<string>

  /**
   * The resolver mode. Use to discriminate between resolver types at runtime.
   *
   * @example
   * ```ts
   * if (resolver.mode === 'static') {
   *   const urlMap = await resolver.preload()
   * }
   * ```
   */
  readonly mode: ResolverMode

  /**
   * Diagnose why a document ID fails (or succeeds) to resolve to a URL.
   *
   * Returns a detailed result with a status code and human-readable message.
   * Use this for debugging when {@link resolveUrlById} returns `null`.
   *
   * @param id - Published document ID to diagnose
   * @param options - Locale options for i18n routes
   * @returns Diagnosis result with status, message, and contextual data
   *
   * @example
   * ```ts
   * const result = await resolver.diagnose('my-doc')
   * if (result.status === 'no_route_entry') {
   *   console.log(result.availableRoutes) // ['blogPost', 'page']
   * }
   * ```
   *
   * @experimental The 6-status contract may evolve.
   * @see {@link DiagnosisResult} for the full result shape
   */
  diagnose(id: string, options?: LocaleOptions): Promise<DiagnosisResult>
}

/**
 * Route resolver that reads from pre-computed route map shards.
 *
 * Use static mode when you need {@link preload} for synchronous URL lookups
 * (e.g., Portable Text link resolution) or {@link resolveDocumentByUrl} for
 * reverse URL resolution. Requires route map shards to be built first via
 * `buildRouteMap()` or the sync Function.
 *
 * @see {@link createRouteResolver} with `{ mode: 'static' }` to create
 * @see {@link RealtimeRouteResolver} for the live GROQ evaluation alternative
 */
export interface StaticRouteResolver extends BaseRouteResolver {
  readonly mode: 'static'

  /**
   * Load all route map shards into a Map for synchronous URL lookups.
   *
   * Returns a Map of document ID → full URL for every document in the route map.
   * Ideal for Portable Text rendering where you need synchronous access to URLs
   * for internal link marks.
   *
   * @param options - Locale options. When set, loads locale-specific shards.
   * @returns Map of document ID → full URL. Empty map if no shards exist.
   *
   * @example
   * ```ts
   * // Preload in parallel with content fetch
   * const [post, urlMap] = await Promise.all([
   *   client.fetch(`*[_type == "blogPost" && slug.current == $slug][0]`, { slug }),
   *   resolver.preload(),
   * ])
   *
   * // Synchronous lookup in Portable Text renderer — no async, no waterfall
   * const components = {
   *   marks: {
   *     internalLink: ({ value, children }) => (
   *       <a href={urlMap.get(value.reference._ref) ?? '#'}>{children}</a>
   *     ),
   *   },
   * }
   * ```
   */
  preload(options?: LocaleOptions): Promise<Map<string, string>>

  /**
   * Rebuild the route map shard for a specific document type.
   *
   * Fetches all documents of the given type, evaluates their pathExpression,
   * and writes the shard to Content Lake via `createOrReplace`. When the route
   * has locales configured and no specific locale is passed, rebuilds all
   * locale-specific shards.
   *
   * @param type - Document type name to rebuild (e.g., `'blogPost'`)
   * @param options - Locale options. Pass a specific locale to rebuild only that shard.
   * @throws If no route entry exists for the given type
   *
   * @example
   * ```ts
   * await resolver.rebuildType('blogPost')
   * // Rebuilds routes-web-blogPost shard
   *
   * await resolver.rebuildType('product', { locale: 'fr' })
   * // Rebuilds routes-web-product-fr shard only
   * ```
   */
  rebuildType(type: string, options?: LocaleOptions): Promise<void>

  /**
   * Reverse-resolve a URL to the document that produces it.
   *
   * Accepts full URLs or path-only input. Normalizes trailing slashes,
   * query parameters, and fragments before comparison.
   *
   * @param url - Full URL or path to resolve (e.g., `'https://example.com/blog/hello'` or `'/blog/hello'`)
   * @returns The document ID and type, or `null` if no match is found
   *
   * @example
   * ```ts
   * const doc = await resolver.resolveDocumentByUrl('/blog/hello-world')
   * // → { id: 'blog-hello', type: 'blogPost' }
   *
   * const doc2 = await resolver.resolveDocumentByUrl('https://example.com/blog/hello-world/')
   * // → { id: 'blog-hello', type: 'blogPost' } (trailing slash normalized)
   * ```
   */
  resolveDocumentByUrl(url: string): Promise<{id: string; type: string} | null>
}

/**
 * Route resolver that evaluates GROQ pathExpressions live against Content Lake.
 *
 * This is the default mode — no setup required. Works immediately without
 * building route map shards. Use when you need always-fresh URL resolution
 * and don't need {@link StaticRouteResolver.preload | preload()} or
 * {@link StaticRouteResolver.resolveDocumentByUrl | resolveDocumentByUrl()}.
 *
 * @see {@link createRouteResolver} to create (default mode)
 * @see {@link StaticRouteResolver} for the pre-computed shard alternative
 */
export interface RealtimeRouteResolver extends BaseRouteResolver {
  readonly mode: 'realtime'

  /**
   * Subscribe to route config changes and invalidate the internal cache.
   *
   * Call this in long-running processes (e.g., dev servers) to keep the
   * resolver's cached config fresh when route configuration changes in Studio.
   *
   * @returns Unsubscribe function. Call it to stop listening.
   *
   * @example
   * ```ts
   * // In a dev server or long-running process
   * const unsubscribe = resolver.listen()
   *
   * // Clean up on shutdown
   * process.on('SIGTERM', () => {
   *   unsubscribe()
   *   process.exit(0)
   * })
   * ```
   */
  listen(): () => void
}

/**
 * Union type of all resolver variants.
 *
 * Use the `mode` property to narrow to {@link StaticRouteResolver} or
 * {@link RealtimeRouteResolver} when you need mode-specific methods.
 *
 * @example
 * ```ts
 * function useResolver(resolver: RouteResolver) {
 *   if (resolver.mode === 'static') {
 *     return resolver.preload() // TypeScript knows this is StaticRouteResolver
 *   }
 * }
 * ```
 */
export type RouteResolver = StaticRouteResolver | RealtimeRouteResolver

/**
 * The two resolver modes.
 *
 * - `'realtime'` — Evaluates GROQ pathExpressions live. Default mode.
 * - `'static'` — Reads from pre-computed route map shards. Enables preload() and resolveDocumentByUrl().
 */
export type ResolverMode = 'realtime' | 'static'

/**
 * Options for {@link createRouteResolver}.
 *
 * @example
 * ```ts
 * // Minimal — realtime mode, auto-detect channel
 * createRouteResolver(client)
 *
 * // Static mode with environment matching
 * createRouteResolver(client, 'web', {
 *   mode: 'static',
 *   environment: 'production',
 * })
 *
 * // Development mode with console warnings
 * createRouteResolver(client, 'web', {
 *   warn: process.env.NODE_ENV !== 'production',
 * })
 * ```
 */
export interface ResolverOptions {
  /** The channel name to resolve routes for (e.g. `"web"`). Optional — if omitted, uses the default config. */
  channel?: string

  /** Resolution mode: `'realtime'` (default) or `'static'`. */
  mode?: ResolverMode

  /** Explicit base URL — highest priority, overrides all baseUrl entries in config. */
  baseUrl?: string

  /** Environment name to match against `baseUrls[].name` (e.g., `'production'`, `'staging'`). */
  environment?: string

  /** Cache TTL in milliseconds (default: `30000`). Controls how long the route config is cached before re-fetching. */
  cacheTtl?: number

  /** Default locale for all resolutions. Can be overridden per-call via `options.locale`. */
  locale?: string

  /**
   * Log a diagnostic message to console when {@link BaseRouteResolver.resolveUrlById}
   * returns `null`. Set to `process.env.NODE_ENV !== 'production'` for
   * development-only warnings.
   */
  warn?: boolean

  /**
   * Callback invoked when {@link BaseRouteResolver.resolveUrlById} returns `null`.
   * Receives a {@link DiagnosisResult} with the failure details. Use for error
   * tracking (e.g., Sentry). Only called when resolution fails — not on successful resolution.
   */
  onResolutionError?: (error: DiagnosisResult) => void
}

/**
 * Result of a {@link buildRouteMap} operation.
 */
export interface BuildResult {
  /** Number of route map shards written. */
  shards: number
  /** Total number of document entries across all shards. */
  entries: number
  /** Error messages for any types that failed to build. */
  errors: string[]
}

/**
 * Options for {@link defineRouteSyncBlueprint}.
 */
export interface BlueprintOptions {
  /** The route config channel to sync (e.g., `'web'`). */
  channel: string
  /** Document types to watch for changes. */
  types: string[]
}
