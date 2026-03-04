import type {SanityClient} from '@sanity/client'
import type {BuildResult, RoutesConfig, RouteMapShard} from './types.js'

const DEFAULT_PATH_EXPRESSION = 'slug.current'

/**
 * Builds route map shards for all types in a channel's route config.
 *
 * Reads the route config from Content Lake, queries all documents per type,
 * evaluates pathExpression GROQ, and writes shards via createOrReplace.
 *
 * @param client - A configured SanityClient with write access
 * @param channel - The channel name (e.g. "web")
 * @returns BuildResult with counts and any errors
 */
export async function buildRouteMap(
  client: SanityClient,
  channel: string,
): Promise<BuildResult> {
  const result: BuildResult = {
    shards: 0,
    entries: 0,
    errors: [],
  }

  // 1. Fetch the route config for this channel
  const config = await client.fetch<RoutesConfig | null>(
    `*[_type == "routes.config" && channel == $channel][0]`,
    {channel},
  )

  if (!config) {
    result.errors.push(`No route config found for channel "${channel}"`)
    return result
  }

  if (!config.routes || config.routes.length === 0) {
    result.errors.push(`Route config for channel "${channel}" has no routes defined`)
    return result
  }

  // 2. Process each route entry
  for (const route of config.routes) {
    if (!route.types || route.types.length === 0) continue

    const pathExpr = route.pathExpression || DEFAULT_PATH_EXPRESSION

    for (const docType of route.types) {
      try {
        // Query all documents of this type and evaluate pathExpression
        const docs = await client.fetch<Array<{_id: string; path: string}>>(
          `*[_type == $docType]{"_id": _id, "path": ${pathExpr}}`,
          {docType},
        )

        const validEntries = docs.filter((d) => d.path)

        // Build the shard document
        const shard: RouteMapShard = {
          _id: `routes-${channel}-${docType}`,
          _type: 'routes.map',
          channel,
          documentType: docType,
          basePath: route.basePath,
          entries: validEntries.map((d, i) => ({
            _key: `entry_${i}`,
            doc: {_ref: d._id, _type: 'reference' as const, _weak: true as const},
            path: d.path,
          })),
        }

        // Write the shard to Content Lake
        await client.createOrReplace(shard)

        result.shards++
        result.entries += validEntries.length
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        result.errors.push(`Error building shard for type "${docType}": ${message}`)
      }
    }
  }

  return result
}
