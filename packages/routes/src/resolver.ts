import type {SanityClient} from '@sanity/client'
import type {
  RouteResolver,
  RoutesConfig,
  RouteEntry,
  RouteMapShard,
  LocaleOptions,
} from './types.js'

const DEFAULT_PATH_EXPRESSION = 'slug.current'
const DEFAULT_CACHE_TTL = 30_000 // 30 seconds

/**
 * Creates a route resolver for the given client and options.
 *
 * Two modes:
 * - **realtime** (default): Evaluates pathExpression GROQ live against Content Lake
 * - **static**: Reads from pre-computed route map shards
 *
 * Channel is optional. When omitted, the resolver will:
 * 1. Look for a config with `isDefault: true`
 * 2. If no default, use the only config if exactly one exists
 * 3. Throw if multiple configs exist and none is marked as default
 */
export function createRouteResolver(
  client: SanityClient,
  channelOrOptions?: string | {
    channel?: string
    mode?: 'realtime' | 'static'
    environment?: string
    baseUrl?: string
    cacheTtl?: number
    locale?: string
  },
  options?: {
    mode?: 'realtime' | 'static'
    environment?: string
    baseUrl?: string
    cacheTtl?: number
    locale?: string
  },
): RouteResolver {
  // Parse overloaded arguments
  let channel: string | undefined
  let resolvedOptions: {
    mode?: 'realtime' | 'static'
    environment?: string
    baseUrl?: string
    cacheTtl?: number
    locale?: string
  }

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

  const {mode = 'realtime', baseUrl, environment, cacheTtl = DEFAULT_CACHE_TTL, locale: defaultLocale} = resolvedOptions

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

  function resolveBaseUrl(config: RoutesConfig): string {
    // 1. Explicit baseUrl option (highest priority)
    if (baseUrl) return baseUrl

    // 2. Environment option matched against baseUrls[].name
    if (environment && config.baseUrls) {
      const match = config.baseUrls.find((entry) => entry.name === environment)
      if (match) return match.url
    }

    // 3. Entry with isDefault: true
    if (config.baseUrls) {
      const defaultEntry = config.baseUrls.find((entry) => entry.isDefault)
      if (defaultEntry) return defaultEntry.url
    }

    return ''
  }

  // ─── Per-route base URL resolution ───────────────────────────────

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
    // Normalize: remove trailing slashes from base, ensure leading slash on path
    const base = resolvedBaseUrl.replace(/\/+$/, '')
    const normalizedBasePath = basePath.replace(/\/+$/, '')
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    return `${base}${normalizedBasePath}${normalizedPath}`
  }

  // ─── Realtime mode implementation ────────────────────────────────

  if (mode === 'realtime') {
    return {
      async resolveUrlById(id: string, options?: LocaleOptions): Promise<string | null> {
        const config = await getConfig()
        const effectiveLocale = options?.locale ?? defaultLocale

        // Determine doc type — fetch if not known
        const docMeta = await client.fetch<{_type: string} | null>(
          `*[_id == $id][0]{_type}`,
          {id},
        )
        if (!docMeta) return null

        const route = findRouteEntry(config, docMeta._type)
        if (!route) return null

        const resolvedBase = resolveBaseUrlForRoute(config, route)
        const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION

        // Evaluate the pathExpression for this specific document
        // $locale is available in pathExpression when locale is provided
        const path = await client.fetch<string | null>(
          `*[_id == $id][0]{\"path\": ${pathExpr}}.path`,
          {id, ...localeParams(effectiveLocale)},
        )
        if (!path) return null

        return assembleUrl(resolvedBase, route.basePath, path)
      },

      async resolveUrlByIds(ids: string[], options?: LocaleOptions): Promise<Map<string, string>> {
        const result = new Map<string, string>()
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
            `*[_id in $groupIds]{\"_id\": _id, \"path\": ${pathExpr}}`,
            {groupIds, ...localeParams(effectiveLocale)},
          )

          for (const entry of paths) {
            if (entry.path) {
              result.set(entry._id, assembleUrl(resolvedBase, route.basePath, entry.path))
            }
          }
        }

        return result
      },

      async groqField(type: string): Promise<string> {
        const config = await getConfig()
        const route = findRouteEntry(config, type)
        if (!route) {
          throw new Error(`No route entry found for type "${type}" in channel "${config.channel}"`)
        }
        // Return a complete GROQ projection field assignment
        const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION
        return `"path": ${pathExpr}`
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

      preload(_options?: LocaleOptions): Promise<Map<string, string>> {
        throw new Error('preload() is only available in static mode')
      },

      rebuildType(_type: string, _options?: LocaleOptions): Promise<void> {
        throw new Error('rebuildType() is only available in static mode')
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

      resolveDocumentByUrl(): Promise<{id: string; type: string} | null> {
        throw new Error(
          'resolveDocumentByUrl() requires static mode. ' +
          'Create the resolver with { mode: "static" } to use reverse resolution.',
        )
      },
    }
  }

  // ─── Static mode implementation ──────────────────────────────────

  // In-memory shard cache for static mode
  let shardCache = new Map<string, RouteMapShard>()

  async function fetchShard(config: RoutesConfig, docType: string, locale?: string): Promise<RouteMapShard | null> {
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
    const types = await staticResolver.getRoutableTypes()
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

    // Cache them
    for (const shard of shards) {
      shardCache.set(shard.documentType, shard)
    }

    return shards
  }

  const staticResolver: RouteResolver = {
    async resolveUrlById(id: string, options?: LocaleOptions): Promise<string | null> {
      const config = await getConfig()
      const effectiveLocale = options?.locale ?? defaultLocale

      // We need to check all shards since we don't know the doc type
      const types = await staticResolver.getRoutableTypes()

      for (const type of types) {
        const shard = await fetchShard(config, type, effectiveLocale)
        if (!shard) continue

        const entry = shard.entries?.find((e) => e.doc._ref === id)
        if (entry) {
          const route = findRouteEntry(config, type)
          const resolvedBase = resolveBaseUrlForRoute(config, route)
          return assembleUrl(resolvedBase, shard.basePath, entry.path)
        }
      }

      return null
    },

    async resolveUrlByIds(ids: string[], options?: LocaleOptions): Promise<Map<string, string>> {
      const result = new Map<string, string>()
      if (ids.length === 0) return result

      const config = await getConfig()
      const effectiveLocale = options?.locale ?? defaultLocale
      const idSet = new Set(ids)

      const types = await staticResolver.getRoutableTypes()

      for (const type of types) {
        const shard = await fetchShard(config, type, effectiveLocale)
        if (!shard) continue

        const route = findRouteEntry(config, type)
        const resolvedBase = resolveBaseUrlForRoute(config, route)

        for (const entry of shard.entries || []) {
          if (!entry.doc?._ref) continue
          if (idSet.has(entry.doc._ref)) {
            result.set(entry.doc._ref, assembleUrl(resolvedBase, shard.basePath, entry.path))
            idSet.delete(entry.doc._ref)
          }
        }

        // Early exit if all found
        if (idSet.size === 0) break
      }

      return result
    },

    async groqField(type: string): Promise<string> {
      const config = await getConfig()
      // Tier 2 map lookup — returns path from pre-computed shard
      const id = shardId(config.channel, type)
      return `"path": *[_id == "${id}"][0].entries[doc._ref == ^._id][0].path`
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

    async preload(options?: LocaleOptions): Promise<Map<string, string>> {
      const config = await getConfig()
      const effectiveLocale = options?.locale ?? defaultLocale
      const shards = await fetchAllShards(config, effectiveLocale)
      const result = new Map<string, string>()

      for (const shard of shards) {
        // Find the route entry for this shard's document type
        const route = findRouteEntry(config, shard.documentType)
        // Resolve base URL: route-level > channel-level
        const resolvedBase = resolveBaseUrlForRoute(config, route)

        for (const entry of shard.entries || []) {
          if (!entry.doc?._ref) continue
          result.set(entry.doc._ref, assembleUrl(resolvedBase, shard.basePath, entry.path))
        }
      }

      if (result.size === 0 && shards.length === 0) {
        console.warn(
          '[@sanity/routes] preload() returned 0 entries. ' +
          'No route map shards found. Make sure the route map has been built ' +
          'for this channel with buildRouteMap().'
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
          await staticResolver.rebuildType(type, {locale: loc})
        }
        return
      }

      const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION

      // Fetch all documents of this type and evaluate pathExpression
      // $locale is available in pathExpression when locale is provided
      const docs = await client.fetch<Array<{_id: string; path: string}>>(
        `*[_type == $type]{\"_id\": _id, \"path\": ${pathExpr}}`,
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

    listen(): () => void {
      throw new Error('listen() is only available in realtime mode')
    },

    async resolveDocumentByUrl(url: string): Promise<{id: string; type: string} | null> {
      const config = await getConfig()
      const effectiveLocale = defaultLocale
      const shards = await fetchAllShards(config, effectiveLocale)

      for (const shard of shards) {
        const route = findRouteEntry(config, shard.documentType)
        const resolvedBase = resolveBaseUrlForRoute(config, route)

        for (const entry of shard.entries || []) {
          if (!entry.doc?._ref) continue
          const entryUrl = assembleUrl(resolvedBase, shard.basePath, entry.path)
          if (entryUrl === url) {
            return {id: entry.doc._ref, type: shard.documentType}
          }
        }
      }

      return null
    },
  }

  return staticResolver
}
