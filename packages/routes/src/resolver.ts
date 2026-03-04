import type {SanityClient} from '@sanity/client'
import type {
  RouteResolver,
  RoutesConfig,
  RouteEntry,
  RouteMapShard,
} from './types.js'

const DEFAULT_PATH_EXPRESSION = 'slug.current'
const DEFAULT_CACHE_TTL = 30_000 // 30 seconds

/**
 * Creates a route resolver for the given client and options.
 *
 * Two modes:
 * - **realtime** (default): Evaluates pathExpression GROQ live against Content Lake
 * - **static**: Reads from pre-computed route map shards
 */
export function createRouteResolver(
  client: SanityClient,
  channel: string,
  options?: {
    mode?: 'realtime' | 'static'
    environment?: string
    baseUrl?: string
    cacheTtl?: number
  },
): RouteResolver {
  const {mode = 'realtime', baseUrl, environment, cacheTtl = DEFAULT_CACHE_TTL} = options ?? {}

  // ─── Lazy config cache ───────────────────────────────────────────
  let configCache: RoutesConfig | null = null
  let configFetchedAt = 0

  async function getConfig(): Promise<RoutesConfig> {
    const now = Date.now()
    if (configCache && now - configFetchedAt < cacheTtl) {
      return configCache
    }

    const config = await client.fetch<RoutesConfig | null>(
      `*[_type == "routes.config" && channel == $channel][0]`,
      {channel},
    )

    if (!config) {
      throw new Error(`No route config found for channel "${channel}"`)
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

  // ─── Route entry lookup ──────────────────────────────────────────

  function findRouteEntry(config: RoutesConfig, docType: string): RouteEntry | undefined {
    return config.routes?.find((route) => route.types?.includes(docType))
  }

  // ─── Shard ID convention ─────────────────────────────────────────

  function shardId(docType: string): string {
    return `routes.${channel}.${docType}`
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
      async resolveById(id: string): Promise<string | null> {
        const config = await getConfig()
        const resolvedBase = resolveBaseUrl(config)

        // Determine doc type — fetch if not known
        const docMeta = await client.fetch<{_type: string} | null>(
          `*[_id == $id][0]{_type}`,
          {id},
        )
        if (!docMeta) return null

        const route = findRouteEntry(config, docMeta._type)
        if (!route) return null

        const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION

        // Evaluate the pathExpression for this specific document
        const path = await client.fetch<string | null>(
          `*[_id == $id][0]{\"path\": ${pathExpr}}.path`,
          {id},
        )
        if (!path) return null

        return assembleUrl(resolvedBase, route.basePath, path)
      },

      async resolveByIds(ids: string[]): Promise<Map<string, string>> {
        const result = new Map<string, string>()
        if (ids.length === 0) return result

        const config = await getConfig()
        const resolvedBase = resolveBaseUrl(config)

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
          const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION
          const groupIds = groupDocs.map((d) => d._id)

          const paths = await client.fetch<Array<{_id: string; path: string}>>(
            `*[_id in $groupIds]{\"_id\": _id, \"path\": ${pathExpr}}`,
            {groupIds},
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
          throw new Error(`No route entry found for type "${type}" in channel "${channel}"`)
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
            const id = `routes.${channel}.${type}`
            declarations.push(
              `fn ${fnName}($id) = *[_id == "${id}"][0].entries[doc._ref == $id][0].path;`,
            )
          }
        }

        return declarations.join('\n')
      },

      preload(): Promise<Map<string, string>> {
        throw new Error('preload() is only available in static mode')
      },

      rebuildType(): Promise<void> {
        throw new Error('rebuildType() is only available in static mode')
      },

      listen(): () => void {
        const subscription = client
          .listen(
            `*[_type == "routes.config" && channel == $channel]`,
            {channel},
            {includeResult: false},
          )
          .subscribe({
            next: () => invalidateCache(),
            error: (err) => console.error('[@sanity/routes] listen error:', err),
          })

        return () => subscription.unsubscribe()
      },
    }
  }

  // ─── Static mode implementation ──────────────────────────────────

  // In-memory shard cache for static mode
  let shardCache = new Map<string, RouteMapShard>()

  async function fetchShard(docType: string): Promise<RouteMapShard | null> {
    const cached = shardCache.get(docType)
    if (cached) return cached

    const shard = await client.fetch<RouteMapShard | null>(
      `*[_id == $shardId][0]`,
      {shardId: shardId(docType)},
    )

    if (shard) {
      shardCache.set(docType, shard)
    }
    return shard
  }

  async function fetchAllShards(config: RoutesConfig): Promise<RouteMapShard[]> {
    const types = await staticResolver.getRoutableTypes()
    const shardIds = types.map((t) => shardId(t))

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
    async resolveById(id: string): Promise<string | null> {
      const config = await getConfig()
      const resolvedBase = resolveBaseUrl(config)

      // We need to check all shards since we don't know the doc type
      const types = await staticResolver.getRoutableTypes()

      for (const type of types) {
        const shard = await fetchShard(type)
        if (!shard) continue

        const entry = shard.entries?.find((e) => e.doc._ref === id)
        if (entry) {
          return assembleUrl(resolvedBase, shard.basePath, entry.path)
        }
      }

      return null
    },

    async resolveByIds(ids: string[]): Promise<Map<string, string>> {
      const result = new Map<string, string>()
      if (ids.length === 0) return result

      const config = await getConfig()
      const resolvedBase = resolveBaseUrl(config)
      const idSet = new Set(ids)

      const types = await staticResolver.getRoutableTypes()

      for (const type of types) {
        const shard = await fetchShard(type)
        if (!shard) continue

        for (const entry of shard.entries || []) {
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
      // Tier 2 map lookup — returns path from pre-computed shard
      const id = shardId(type)
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

    async preload(): Promise<Map<string, string>> {
      const config = await getConfig()
      const resolvedBase = resolveBaseUrl(config)
      const shards = await fetchAllShards(config)
      const result = new Map<string, string>()

      for (const shard of shards) {
        for (const entry of shard.entries || []) {
          result.set(entry.doc._ref, assembleUrl(resolvedBase, shard.basePath, entry.path))
        }
      }

      return result
    },

    async rebuildType(type: string): Promise<void> {
      const config = await getConfig()
      const route = findRouteEntry(config, type)
      if (!route) {
        throw new Error(`No route entry found for type "${type}" in channel "${channel}"`)
      }

      const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION

      // Fetch all documents of this type and evaluate pathExpression
      const docs = await client.fetch<Array<{_id: string; path: string}>>(
        `*[_type == $type]{\"_id\": _id, \"path\": ${pathExpr}}`,
        {type},
      )

      // Build the shard document
      const shard: RouteMapShard = {
        _id: shardId(type),
        _type: 'routes.map',
        channel,
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
      shardCache.set(type, shard)
    },

    async groqFunctions(): Promise<string> {
      const config = await getConfig()
      const declarations: string[] = []

      for (const route of config.routes || []) {
        for (const type of route.types || []) {
          const fnName = `routes::${type}Path`
          const id = shardId(type)
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
  }

  return staticResolver
}
