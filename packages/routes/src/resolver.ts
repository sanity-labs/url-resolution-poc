import type {SanityClient} from '@sanity/client'
import type {
  RouteResolver,
  RoutesConfig,
  RouteEntry,
  RouteMapShard,
  LocaleOptions,
  DiagnosisResult,
  ResolverOptions,
} from './types.js'

const DEFAULT_PATH_EXPRESSION = 'slug.current'
const DEFAULT_CACHE_TTL = 30_000 // 30 seconds

/**
 * Create a unified route resolver for URL resolution from Sanity documents.
 *
 * Returns a {@link RouteResolver} with all methods — both realtime GROQ evaluation
 * (`resolveUrlById`, `pathProjection`, `listen`, etc.) and static shard lookups
 * (`preload`, `resolveDocumentByUrl`, `rebuildType`).
 *
 * @param client - A configured `SanityClient`. For shard-based methods (`preload`,
 *   `resolveDocumentByUrl`) with private shard IDs, the client must have a read token.
 * @param channelOrOptions - Route config channel name (e.g., `'web'`), or options object.
 *   Optional — when omitted, uses the config marked `isDefault: true`, or the only
 *   config if exactly one exists.
 * @param options - Resolver options including environment and error handling.
 * @returns A {@link RouteResolver} with all methods.
 *
 * @example
 * ```ts
 * import { createRouteResolver } from '@sanity/routes'
 * import { client } from './sanity'
 *
 * const resolver = createRouteResolver(client, 'web')
 *
 * // Realtime — evaluates GROQ live, always fresh
 * const url = await resolver.resolveUrlById('article-123')
 *
 * // Static — reads from pre-computed shards (requires buildRouteMap or sync Function)
 * const urlMap = await resolver.preload()
 *
 * // With environment matching and dev warnings
 * const resolver = createRouteResolver(client, 'web', {
 *   environment: process.env.SANITY_ROUTES_ENV,
 *   warn: process.env.NODE_ENV !== 'production',
 * })
 * ```
 *
 * @see {@link RouteResolver} for the full method list
 */
export function createRouteResolver(
  client: SanityClient,
  channelOrOptions?: string | ResolverOptions,
  options?: ResolverOptions,
): RouteResolver {
  // Parse overloaded arguments
  let channel: string | undefined
  let resolvedOptions: ResolverOptions

  if (typeof channelOrOptions === 'string') {
    channel = channelOrOptions
    resolvedOptions = options ?? {}
  } else if (typeof channelOrOptions === 'object' && channelOrOptions !== null) {
    channel = channelOrOptions.channel
    resolvedOptions = channelOrOptions
  } else {
    channel = undefined
    resolvedOptions = options ?? {}
  }

  const {baseUrl, environment, cacheTtl = DEFAULT_CACHE_TTL, locale: defaultLocale, warn: warnOnError, onResolutionError} = resolvedOptions

  // ─── Locale helper ───────────────────────────────────────────────
  function localeParams(effectiveLocale?: string): Record<string, string> {
    return effectiveLocale ? {locale: effectiveLocale} : {}
  }

  // ─── Lazy config cache ───────────────────────────────────────────
  let configCache: RoutesConfig | null = null
  let configFetchedAt = 0

  async function getConfig(): Promise<RoutesConfig> {
    const now = Date.now()
    if (configCache && now - configFetchedAt < cacheTtl) {
      return configCache
    }

    let config: RoutesConfig | null = null

    if (channel) {
      // Explicit channel — use current query
      config = await client.fetch<RoutesConfig | null>(
        `*[_type == "routes.config" && channel == $channel][0]`,
        {channel},
      )

      if (!config) {
        throw new Error(`No route config found for channel "${channel}"`)
      }
    } else {
      // No channel specified — try default, then single-config fallback
      config = await client.fetch<RoutesConfig | null>(
        `*[_type == "routes.config" && isDefault == true][0]`,
      )

      if (!config) {
        // No default found — check if there's exactly one config
        const allConfigs = await client.fetch<RoutesConfig[]>(
          `*[_type == "routes.config"]`,
        )

        if (allConfigs.length === 1) {
          config = allConfigs[0]
        } else if (allConfigs.length === 0) {
          throw new Error(
            'No route config found. Create a routes.config document in your dataset.',
          )
        } else {
          throw new Error(
            `Multiple route configs found (${allConfigs.length}) but none is marked as default. ` +
            'Either specify a channel explicitly, or set isDefault: true on one config.',
          )
        }
      }
    }

    configCache = config
    configFetchedAt = now
    return config
  }

  function invalidateCache(): void {
    configCache = null
    configFetchedAt = 0
  }

  // ─── Base URL resolution ─────────────────────────────────────────

  /**
   * Resolve the base URL for a specific route entry.
   * Precedence: explicit option > route-level baseUrls (env match > isDefault) > channel-level baseUrls (env match > isDefault)
   */
  function resolveBaseUrlForRoute(config: RoutesConfig, route?: RouteEntry): string {
    // 1. Explicit baseUrl option (highest priority)
    if (baseUrl) return baseUrl

    // 2. Route-level baseUrls (if present)
    if (route?.baseUrls?.length) {
      // Same logic as channel-level: environment match > isDefault
      if (environment) {
        const match = route.baseUrls.find((entry) => entry.name === environment)
        if (match) return match.url
      }
      const defaultEntry = route.baseUrls.find((entry) => entry.isDefault)
      if (defaultEntry) return defaultEntry.url
      // If route has baseUrls but no match, fall through to channel-level
    }

    // 3. Channel-level baseUrls
    if (environment && config.baseUrls) {
      const match = config.baseUrls.find((entry) => entry.name === environment)
      if (match) return match.url
    }
    if (config.baseUrls) {
      const defaultEntry = config.baseUrls.find((entry) => entry.isDefault)
      if (defaultEntry) return defaultEntry.url
    }

    return ''
  }

  // ─── Route entry lookup ──────────────────────────────────────────

  function findRouteEntry(config: RoutesConfig, docType: string): RouteEntry | undefined {
    return config.routes?.find((route) => route.types?.includes(docType))
  }

  // ─── Shard ID convention ─────────────────────────────────────────

  function shardId(resolvedChannel: string, docType: string): string {
    return `routes-${resolvedChannel}-${docType}`
  }

  // ─── Full URL assembly ───────────────────────────────────────────

  function assembleUrl(resolvedBaseUrl: string, basePath: string, path: string): string {
    // Normalize: strip trailing slash from base, ensure leading slash on basePath, strip trailing
    const base = resolvedBaseUrl.replace(/\/+$/, '')
    const normalizedBasePath = basePath ? `/${basePath.replace(/^\/+|\/+$/g, '')}` : ''
    const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : ''

    return `${base}${normalizedBasePath}${normalizedPath}`
  }

  // ─── URL normalization ───────────────────────────────────────────

  function normalizeUrl(url: string): string {
    // Strip query params and fragments
    const cleaned = url.split('?')[0].split('#')[0]
    // Strip trailing slash (but keep root '/')
    return cleaned.length > 1 ? cleaned.replace(/\/+$/, '') : cleaned
  }

  function extractPathname(url: string): string | null {
    try {
      return new URL(url).pathname
    } catch {
      return null
    }
  }

  // ─── Resolution failure handler ─────────────────────────────────

  async function handleResolutionFailure(
    id: string,
    options: LocaleOptions | undefined,
  ): Promise<void> {
    if (!warnOnError && !onResolutionError) return
    const diagnosis = await resolver.diagnose(id, options)
    if (warnOnError) {
      console.warn(`[@sanity/routes] ${diagnosis.message}`)
    }
    if (onResolutionError) {
      onResolutionError(diagnosis)
    }
  }

  // ─── Shared diagnosis steps 1-3 ──────────────────────────────────

  async function diagnoseBase(id: string): Promise<
    DiagnosisResult | {config: RoutesConfig; docType: string; route: RouteEntry}
  > {
    // 1. Check config
    let config: RoutesConfig
    try {
      config = await getConfig()
    } catch {
      return {
        status: 'no_config',
        documentId: id,
        message: `No route config found. Cannot resolve URL for document "${id}".`,
      }
    }

    // 2. Fetch document type
    const docMeta = await client.fetch<{_type: string} | null>(
      `*[_id == $id][0]{_type}`,
      {id},
    )
    if (!docMeta) {
      return {
        status: 'document_not_found',
        documentId: id,
        message: `Document "${id}" not found in the dataset.`,
      }
    }

    // 3. Find route entry
    const route = findRouteEntry(config, docMeta._type)
    const availableRoutes = (config.routes || []).flatMap((r) => r.types || [])
    if (!route) {
      return {
        status: 'no_route_entry',
        documentId: id,
        documentType: docMeta._type,
        availableRoutes,
        message: `No route entry for type "${docMeta._type}". Available routable types: ${availableRoutes.join(', ') || 'none'}.`,
      }
    }

    return {config, docType: docMeta._type, route}
  }

  // ─── Shard cache (for preload, rebuildType, resolveDocumentByUrl) ─

  let shardCache = new Map<string, RouteMapShard>()
  let shardCacheFetchedAt = 0

  function isShardCacheStale(): boolean {
    return Date.now() - shardCacheFetchedAt > cacheTtl
  }

  async function fetchShard(config: RoutesConfig, docType: string, locale?: string): Promise<RouteMapShard | null> {
    if (isShardCacheStale()) {
      shardCache.clear()
      shardCacheFetchedAt = Date.now()
    }

    const route = findRouteEntry(config, docType)
    const sid = (route?.locales?.length && locale)
      ? `${shardId(config.channel, docType)}-${locale}`
      : shardId(config.channel, docType)
    const cacheKey = sid

    const cached = shardCache.get(cacheKey)
    if (cached) return cached

    const shard = await client.fetch<RouteMapShard | null>(
      `*[_id == $shardId][0]`,
      {shardId: sid},
    )

    if (shard) {
      shardCache.set(cacheKey, shard)
    }
    return shard
  }

  async function fetchAllShards(config: RoutesConfig, locale?: string): Promise<RouteMapShard[]> {
    const types = await resolver.getRoutableTypes()
    const shardIds: string[] = []

    for (const t of types) {
      const route = findRouteEntry(config, t)
      if (route?.locales?.length && locale) {
        // Locale-specific shard for i18n routes
        shardIds.push(`${shardId(config.channel, t)}-${locale}`)
      } else {
        // Non-i18n shard (or no locale specified)
        shardIds.push(shardId(config.channel, t))
      }
    }

    const shards = await client.fetch<RouteMapShard[]>(
      `*[_id in $shardIds]`,
      {shardIds},
    )

    // Cache them (use shard._id as key — matches fetchShard's cache key convention)
    for (const shard of shards) {
      shardCache.set(shard._id, shard)
    }
    shardCacheFetchedAt = Date.now()

    return shards
  }

  // ─── Unified resolver ────────────────────────────────────────────

  const resolver: RouteResolver = {
    // --- Realtime methods (use GROQ evaluation) ---

    async resolveUrlById(id: string, options?: LocaleOptions): Promise<string | null> {
      const config = await getConfig()
      const effectiveLocale = options?.locale ?? defaultLocale

      // Determine doc type — fetch if not known
      const docMeta = await client.fetch<{_type: string} | null>(
        `*[_id == $id][0]{_type}`,
        {id},
      )
      if (!docMeta) {
        await handleResolutionFailure(id, options)
        return null
      }

      const route = findRouteEntry(config, docMeta._type)
      if (!route) {
        await handleResolutionFailure(id, options)
        return null
      }

      const resolvedBase = resolveBaseUrlForRoute(config, route)
      const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION

      // Evaluate the pathExpression for this specific document
      // $locale is available in pathExpression when locale is provided
      const path = await client.fetch<string | null>(
        `*[_id == $id][0]{"path": ${pathExpr}}.path`,
        {id, ...localeParams(effectiveLocale)},
      )
      if (!path) {
        await handleResolutionFailure(id, options)
        return null
      }

      return assembleUrl(resolvedBase, route.basePath, path)
    },

    async resolveUrlByIds(ids: string[], options?: LocaleOptions): Promise<Record<string, string>> {
      const result: Record<string, string> = {}
      if (ids.length === 0) return result

      const config = await getConfig()
      const effectiveLocale = options?.locale ?? defaultLocale

      // Fetch types for all IDs in one query
      const docs = await client.fetch<Array<{_id: string; _type: string}>>(
        `*[_id in $ids]{_id, _type}`,
        {ids},
      )

      // Group by route entry for efficient batch queries
      const byRoute = new Map<RouteEntry, Array<{_id: string; _type: string}>>()
      for (const doc of docs) {
        const route = findRouteEntry(config, doc._type)
        if (route) {
          const group = byRoute.get(route) || []
          group.push(doc)
          byRoute.set(route, group)
        }
      }

      // Evaluate pathExpression per route group
      for (const [route, groupDocs] of byRoute) {
        const resolvedBase = resolveBaseUrlForRoute(config, route)
        const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION
        const groupIds = groupDocs.map((d) => d._id)

        const paths = await client.fetch<Array<{_id: string; path: string}>>(
          `*[_id in $groupIds]{"_id": _id, "path": ${pathExpr}}`,
          {groupIds, ...localeParams(effectiveLocale)},
        )

        for (const entry of paths) {
          if (entry.path) {
            result[entry._id] = assembleUrl(resolvedBase, route.basePath, entry.path)
          }
        }
      }

      return result
    },

    async pathProjection(type: string): Promise<string> {
      const config = await getConfig()
      const route = findRouteEntry(config, type)
      if (!route) {
        throw new Error(`No route entry found for type "${type}" in channel "${config.channel}"`)
      }
      // Return a complete GROQ projection field assignment
      const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION
      return `"path": ${pathExpr}`
    },

    /** @deprecated Use {@link pathProjection} instead. */
    async groqField(type: string): Promise<string> {
      return resolver.pathProjection(type)
    },

    async resolvePathById(id: string, options?: LocaleOptions): Promise<string | null> {
      const url = await resolver.resolveUrlById(id, options)
      if (!url) return null
      return extractPathname(url)
    },

    async resolvePathByIds(ids: string[], options?: LocaleOptions): Promise<Record<string, string>> {
      const urlMap = await resolver.resolveUrlByIds(ids, options)
      const result: Record<string, string> = {}
      for (const [id, url] of Object.entries(urlMap)) {
        const pathname = extractPathname(url)
        if (pathname) result[id] = pathname
      }
      return result
    },

    async getRoutableTypes(): Promise<string[]> {
      const config = await getConfig()
      const types: string[] = []
      for (const route of config.routes || []) {
        for (const t of route.types || []) {
          if (!types.includes(t)) types.push(t)
        }
      }
      return types
    },

    async groqFunctions(): Promise<string> {
      const config = await getConfig()
      const declarations: string[] = []

      for (const route of config.routes || []) {
        for (const type of route.types || []) {
          const fnName = `routes::${type}Path`
          const id = shardId(config.channel, type)
          declarations.push(
            `fn ${fnName}($id) = *[_id == "${id}"][0].entries[doc._ref == $id][0].path;`,
          )
        }
      }

      return declarations.join('\n')
    },

    async diagnose(id: string, options?: LocaleOptions): Promise<DiagnosisResult> {
      const base = await diagnoseBase(id)
      if ('status' in base) return base

      const {config, docType, route} = base

      // 4. Evaluate pathExpression via realtime GROQ
      const effectiveLocale = options?.locale ?? defaultLocale
      const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION
      const path = await client.fetch<string | null>(
        `*[_id == $id][0]{"path": ${pathExpr}}.path`,
        {id, ...localeParams(effectiveLocale)},
      )
      if (!path) {
        return {
          status: 'empty_path',
          documentId: id,
          documentType: docType,
          message: `Path expression "${pathExpr}" returned null/empty for document "${id}" (type: "${docType}").`,
        }
      }

      // 5. Everything works
      const resolvedBase = resolveBaseUrlForRoute(config, route)
      const url = assembleUrl(resolvedBase, route.basePath, path)
      return {
        status: 'resolved',
        documentId: id,
        documentType: docType,
        url,
        message: `Document "${id}" resolves to ${url}.`,
      }
    },

    listen(): () => void {
      // Use channel if provided, otherwise listen to all route configs
      const query = channel
        ? `*[_type == "routes.config" && channel == $channel]`
        : `*[_type == "routes.config"]`
      const params = channel ? {channel} : {}

      const subscription = client
        .listen(query, params, {includeResult: false})
        .subscribe({
          next: () => invalidateCache(),
          error: (err) => console.error('[@sanity/routes] listen error:', err),
        })

      return () => subscription.unsubscribe()
    },

    // --- Static methods (use shards) ---

    async preload(options?: LocaleOptions): Promise<Record<string, string>> {
      const config = await getConfig()
      const effectiveLocale = options?.locale ?? defaultLocale
      const shards = await fetchAllShards(config, effectiveLocale)
      const result: Record<string, string> = {}

      for (const shard of shards) {
        // Find the route entry for this shard's document type
        const route = findRouteEntry(config, shard.documentType)
        // Resolve base URL: route-level > channel-level
        const resolvedBase = resolveBaseUrlForRoute(config, route)

        for (const entry of shard.entries || []) {
          if (!entry.doc?._ref) continue
          result[entry.doc._ref] = assembleUrl(resolvedBase, shard.basePath, entry.path)
        }
      }

      if (Object.keys(result).length === 0 && shards.length === 0) {
        console.warn(
          '[@sanity/routes] preload() returned 0 entries. ' +
          'Route map shards require the Sync Function or buildRouteMap(). ' +
          'Make sure your Sanity client has a read token if shard IDs contain dots.'
        )
      }

      return result
    },

    async rebuildType(type: string, options?: LocaleOptions): Promise<void> {
      const config = await getConfig()
      const route = findRouteEntry(config, type)
      if (!route) {
        throw new Error(`No route entry found for type "${type}" in channel "${config.channel}"`)
      }

      const effectiveLocale = options?.locale ?? defaultLocale

      // If route has locales and no specific locale requested, build for all locales
      if (route.locales?.length && !effectiveLocale) {
        for (const loc of route.locales) {
          await resolver.rebuildType(type, {locale: loc})
        }
        return
      }

      const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION

      // Fetch all documents of this type and evaluate pathExpression
      // $locale is available in pathExpression when locale is provided
      const docs = await client.fetch<Array<{_id: string; path: string}>>(
        `*[_type == $type]{"_id": _id, "path": ${pathExpr}}`,
        {type, ...localeParams(effectiveLocale)},
      )

      // Shard ID includes locale if present (for i18n routes)
      const sid = effectiveLocale
        ? `${shardId(config.channel, type)}-${effectiveLocale}`
        : shardId(config.channel, type)

      // Build the shard document
      const shard: RouteMapShard = {
        _id: sid,
        _type: 'routes.map',
        channel: config.channel,
        documentType: type,
        basePath: route.basePath,
        entries: docs
          .filter((d) => d.path)
          .map((d, i) => ({
            _key: `entry_${i}`,
            doc: {_ref: d._id, _type: 'reference' as const, _weak: true as const},
            path: d.path,
          })),
      }

      await client.createOrReplace(shard)

      // Update cache
      shardCache.set(sid, shard)
    },

    async resolveDocumentByUrl(url: string): Promise<{id: string; type: string} | null> {
      const config = await getConfig()
      const effectiveLocale = defaultLocale
      const shards = await fetchAllShards(config, effectiveLocale)
      const normalizedInput = normalizeUrl(url)
      const isPathOnly = !normalizedInput.startsWith('http')

      for (const shard of shards) {
        const route = findRouteEntry(config, shard.documentType)
        const resolvedBase = resolveBaseUrlForRoute(config, route)

        for (const entry of shard.entries || []) {
          if (!entry.doc?._ref) continue
          const entryUrl = assembleUrl(resolvedBase, shard.basePath, entry.path)
          const normalizedEntry = normalizeUrl(entryUrl)

          if (isPathOnly) {
            // Compare against just the path portion of the assembled URL
            try {
              const parsed = new URL(normalizedEntry)
              if (normalizeUrl(parsed.pathname) === normalizedInput) {
                return {id: entry.doc._ref, type: shard.documentType}
              }
            } catch {
              // If entryUrl is not a valid URL (no base URL configured), compare directly
              if (normalizedEntry === normalizedInput) {
                return {id: entry.doc._ref, type: shard.documentType}
              }
            }
          } else {
            if (normalizedEntry === normalizedInput) {
              return {id: entry.doc._ref, type: shard.documentType}
            }
          }
        }
      }

      return null
    },
  }

  return resolver
}
