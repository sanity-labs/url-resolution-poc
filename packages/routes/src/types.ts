import type {SanityClient} from '@sanity/client'

// ─── Route Config (stored in Content Lake) ───────────────────────────

export interface RoutesConfig {
  _id: string
  _type: 'routes.config'
  channel: string
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
  docId: string
  path: string
}

// ─── Resolver Interface ──────────────────────────────────────────────

export interface RouteResolver {
  /** Resolve a single document ID to its full URL */
  resolveById(id: string): Promise<string | null>

  /** Resolve multiple document IDs to their full URLs */
  resolveByIds(ids: string[]): Promise<Map<string, string>>

  /**
   * Returns a GROQ expression for the path portion of a route.
   * Does NOT include baseUrl or basePath — only the relative path.
   */
  groqField(type: string): Promise<string>

  /** List all document types that have route entries */
  getRoutableTypes(): Promise<string[]>

  /** Static mode only: preload all shards into a Map<docId, fullUrl> */
  preload(): Promise<Map<string, string>>

  /** Static mode only: rebuild the route map shard for a given type */
  rebuildType(type: string): Promise<void>

  /** Generate custom GROQ function declarations for all routable types */
  groqFunctions(): Promise<string>

  /** Realtime mode only: subscribe to content changes, returns unsubscribe fn */
  listen(): () => void
}

// ─── Resolver Options ────────────────────────────────────────────────

export type ResolverMode = 'realtime' | 'static'

export interface ResolverOptions {
  /** The channel name to resolve routes for (e.g. "web") */
  channel: string

  /** Resolution mode: 'realtime' (default) or 'static' */
  mode?: ResolverMode

  /** Explicit base URL — highest priority */
  baseUrl?: string

  /** Environment name to match against baseUrls[].name */
  environment?: string

  /** Cache TTL in milliseconds (default: 30000) */
  cacheTtl?: number
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
