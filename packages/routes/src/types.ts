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

// ─── Resolver Interface ──────────────────────────────────────────────

export interface RouteResolver {
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

  /** Static mode only: preload all shards into a Map<docId, fullUrl> */
  preload(options?: LocaleOptions): Promise<Map<string, string>>

  /** Static mode only: rebuild the route map shard for a given type */
  rebuildType(type: string, options?: LocaleOptions): Promise<void>

  /** Generate custom GROQ function declarations for all routable types */
  groqFunctions(): Promise<string>

  /** Realtime mode only: subscribe to content changes, returns unsubscribe fn */
  listen(): () => void

  /** Static mode only: reverse-resolve a full URL to its document ID and type */
  resolveDocumentByUrl(url: string): Promise<{id: string; type: string} | null>
}

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
