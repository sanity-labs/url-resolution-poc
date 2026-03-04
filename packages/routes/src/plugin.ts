import {definePlugin} from 'sanity'
import {routeConfig} from './schema.js'

/**
 * Sanity plugin that registers the route configuration schema type.
 *
 * Usage in sanity.config.ts:
 * ```ts
 * import {routesPlugin} from '@sanity/routes'
 *
 * export default defineConfig({
 *   plugins: [routesPlugin()],
 * })
 * ```
 */
export const routesPlugin = definePlugin(() => ({
  name: '@sanity/routes',
  schema: {types: [routeConfig]},
}))
