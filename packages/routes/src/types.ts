import type {SanityClient} from '@sanity/client'

// ─── Route Config (stored in Content Lake) ───────────────────────────

export interface RoutesConfig {
  _id: string
  _type: 'routes.config'
  channel: string
  isDefault?: boolean
  baseUrls: BaseUrlEntry[]
  routes: RouteEntry[]
}

export interface BaseUrlEntry {
  _key?: string
  name: string
  url: string
  isDefault?: boolean
}

export interface RouteEntry {
  _key?: string
  types: string[]
  basePath: string
  pathExpression?: string // defaults to "slug.current"
  baseUrls?: BaseUrlEntry[] // per-route base URL overrides (same shape as channel-level)
  locales?: string[] // supported locales for this route (e.g., ['en', 'fr', 'de'])
  mode?: 'simpleSlug' | 'parentSlug' | 'custom' // route mode for Studio UI
  slugField?: string // field name for slug (default: 'slug')
  parentType?: string // parent document type (for parentSlug mode)
  parentSlugField?: string // slug field on parent (default: 'slug')
  parentRelationship?: 'parentReferencesChild' | 'childReferencesParent'
  parentReferenceField?: string // reference field name on parent
}

// ─── Route Map Shards (pre-computed, stored in Content Lake) ─────────

export interface RouteMapShard {
  _id: string
  _type: 'routes.map'
  channel: string
  documentType: string
  basePath: string
  entries: RouteMapEntry[]
}

export interface RouteMapEntry {
  _key?: string
  doc: {_ref: string; _type: 'reference'; _weak?: boolean}
  path: string
}

// ─── Locale Options ──────────────────────────────────────────────────

export interface LocaleOptions {
  /** Locale to use when evaluating pathExpression (available as $locale in GROQ) */
  locale?: string
}

// ─── Diagnosis Result ────────────────────────────────────────────────

export type DiagnosisStatus =
  | 'resolved'
  | 'document_not_found'
  | 'no_route_entry'
  | 'empty_path'
  | 'no_config'
  | 'shard_not_found'

export interface DiagnosisResult {
  status: DiagnosisStatus
  documentId: string
  documentType?: string
  url?: string
  availableRoutes?: string[]
  message: string
}

// ─── Base Resolver (shared by both modes) ────────────────────────────

export interface BaseRouteResolver {
  /** Resolve a single document ID to its full URL */
  resolveUrlById(id: string, options?: LocaleOptions): Promise<string | null>

  /** Resolve multiple document IDs to their full URLs */
  resolveUrlByIds(ids: string[], options?: LocaleOptions): Promise<Map<string, string>>

  /**
   * Returns a GROQ expression for the path portion of a route.
   * Does NOT include baseUrl or basePath — only the relative path.
   */
  groqField(type: string): Promise<string>

  /** List all document types that have route entries */
  getRoutableTypes(): Promise<string[]>

  /** Generate custom GROQ function declarations for all routable types */
  groqFunctions(): Promise<string>

  /** The resolver mode */
  readonly mode: ResolverMode

  /** Diagnose why a document ID fails to resolve */
  diagnose(id: string, options?: LocaleOptions): Promise<DiagnosisResult>
}

// ─── Static Resolver ─────────────────────────────────────────────────

export interface StaticRouteResolver extends BaseRouteResolver {
  readonly mode: 'static'

  /** Preload all shards into a Map<docId, fullUrl> */
  preload(options?: LocaleOptions): Promise<Map<string, string>>

  /** Rebuild the route map shard for a given type */
  rebuildType(type: string, options?: LocaleOptions): Promise<void>

  /** Reverse-resolve a full URL to its document ID and type */
  resolveDocumentByUrl(url: string): Promise<{id: string; type: string} | null>
}

// ─── Realtime Resolver ───────────────────────────────────────────────

export interface RealtimeRouteResolver extends BaseRouteResolver {
  readonly mode: 'realtime'

  /** Subscribe to content changes, returns unsubscribe fn */
  listen(): () => void
}

/** Union type for backward compatibility */
export type RouteResolver = StaticRouteResolver | RealtimeRouteResolver

// ─── Resolver Options ────────────────────────────────────────────────

export type ResolverMode = 'realtime' | 'static'

export interface ResolverOptions {
  /** The channel name to resolve routes for (e.g. "web"). Optional — if omitted, uses the default config. */
  channel?: string

  /** Resolution mode: 'realtime' (default) or 'static' */
  mode?: ResolverMode

  /** Explicit base URL — highest priority */
  baseUrl?: string

  /** Environment name to match against baseUrls[].name */
  environment?: string

  /** Cache TTL in milliseconds (default: 30000) */
  cacheTtl?: number

  /** Default locale for all resolutions. Can be overridden per-call via options. */
  locale?: string

  /** Log warnings to console on resolution failure */
  warn?: boolean

  /** Callback for resolution errors (e.g., Sentry integration) */
  onResolutionError?: (error: DiagnosisResult) => void
}

// ─── Build Result ────────────────────────────────────────────────────

export interface BuildResult {
  shards: number
  entries: number
  errors: string[]
}

// ─── Blueprint Options ───────────────────────────────────────────────

export interface BlueprintOptions {
  channel: string
  types: string[]
}
