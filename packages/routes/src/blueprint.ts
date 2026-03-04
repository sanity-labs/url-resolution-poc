import type {BlueprintOptions} from './types.js'

/**
 * Blueprint configuration for route sync.
 *
 * Represents the configuration needed for a Sanity Function that
 * keeps route map shards in sync when content changes.
 */
export interface RouteSyncBlueprint {
  name: string
  title: string
  description: string
  filter: string
  includeDrafts: boolean
  includeAllVersions: boolean
  channel: string
  types: string[]
}

/**
 * Generates a blueprint configuration for a route sync function.
 *
 * This creates the configuration needed for a Sanity Function (via defineBlueprint
 * + defineDocumentFunction) that listens for changes to routable documents and
 * rebuilds the affected route map shards.
 *
 * The filter watches for changes to slug or _type fields on the specified types.
 *
 * @example
 * ```ts
 * const blueprint = defineRouteSyncBlueprint({
 *   channel: 'web',
 *   types: ['article', 'blogPost', 'page'],
 * })
 * // Use with Sanity Functions:
 * // defineBlueprint(blueprint)
 * ```
 */
export function defineRouteSyncBlueprint(options: BlueprintOptions): RouteSyncBlueprint {
  const {channel, types} = options

  if (!channel) {
    throw new Error('defineRouteSyncBlueprint requires a channel name')
  }

  if (!types || types.length === 0) {
    throw new Error('defineRouteSyncBlueprint requires at least one document type')
  }

  // Build the GROQ filter for the document function
  // Watches for changes to slug or _type on the specified document types
  const typeList = types.map((t) => `"${t}"`).join(', ')
  const filter = `_type in [${typeList}] && delta::changedAny(('slug', '_type'))`

  return {
    name: `routes-sync-${channel}`,
    title: `Route Sync: ${channel}`,
    description: `Keeps route map shards in sync for the "${channel}" channel when content changes.`,
    filter,
    includeDrafts: false,
    includeAllVersions: false,
    channel,
    types,
  }
}
