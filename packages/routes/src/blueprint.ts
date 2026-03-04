import type {BlueprintOptions} from './types.js'

/**
 * Blueprint configuration for route sync.
 *
 * Represents the configuration needed for a Sanity Function that
 * keeps route map shards in sync when content changes.
 */
export interface RouteSyncBlueprint {
  name: string
  event: {
    on: readonly string[]
    filter: string
    projection: string
  }
}

/**
 * Generates a blueprint configuration for a route sync function.
 *
 * Returns a config object compatible with `defineDocumentFunction()` from
 * `@sanity/blueprints`. Use it directly in your blueprint definition.
 *
 * @param channel - The route config channel (e.g., 'web')
 * @param options - Configuration with the document types to watch
 * @returns A config object for `defineDocumentFunction()`
 *
 * @example
 * ```ts
 * // studio/functions/route-sync/function.ts
 * import { defineDocumentFunction } from '@sanity/blueprints'
 * import { defineRouteSyncBlueprint } from '@sanity/routes'
 *
 * export const routeSyncFunction = defineDocumentFunction(
 *   defineRouteSyncBlueprint('web', { types: ['article', 'blogPost'] })
 * )
 * ```
 */
export function defineRouteSyncBlueprint(
  channel: string,
  options: {types: string[]},
): RouteSyncBlueprint

/**
 * @deprecated Use `defineRouteSyncBlueprint(channel, options)` instead.
 */
export function defineRouteSyncBlueprint(options: BlueprintOptions): RouteSyncBlueprint

export function defineRouteSyncBlueprint(
  channelOrOptions: string | BlueprintOptions,
  maybeOptions?: {types: string[]},
): RouteSyncBlueprint {
  let channel: string
  let types: string[]

  if (typeof channelOrOptions === 'string') {
    channel = channelOrOptions
    types = maybeOptions?.types ?? []
  } else {
    channel = channelOrOptions.channel
    types = channelOrOptions.types
  }

  if (!channel) {
    throw new Error('defineRouteSyncBlueprint requires a channel name')
  }

  if (!types || types.length === 0) {
    throw new Error('defineRouteSyncBlueprint requires at least one document type')
  }

  const typeFilter = types.map((t) => `"${t}"`).join(', ')

  return {
    name: `route-sync-${channel}`,
    event: {
      on: ['create', 'update', 'delete'] as const,
      filter: `_type in [${typeFilter}]`,
      projection: `{ _id, _type, slug }`,
    },
  }
}
