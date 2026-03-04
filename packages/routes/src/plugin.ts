import {definePlugin} from 'sanity'
import {routeConfig, createRouteMapType} from './schema.js'

export {routesPresentation} from './presentation.js'
export type {RoutesPresentationOptions} from './presentation.js'

/**
 * Options for the routes plugin.
 */
export interface RoutesPluginOptions {
  /**
   * The document type names that can appear in route maps.
   * These are passed to the route map schema's `doc` reference field
   * so Sanity knows which types are valid reference targets.
   *
   * @example ['article', 'blogPost']
   */
  types?: string[]
}

/**
 * Sanity plugin that registers the route configuration schema types.
 *
 * Usage in sanity.config.ts:
 * ```ts
 * import {routesPlugin} from '@sanity/routes'
 *
 * export default defineConfig({
 *   plugins: [
 *     routesPlugin({ types: ['article', 'blogPost'] }),
 *   ],
 * })
 * ```
 */
export const routesPlugin = definePlugin<RoutesPluginOptions | void>((options) => ({
  name: '@sanity/routes',
  schema: {
    types: [routeConfig, createRouteMapType(options?.types)],
  },
}))
