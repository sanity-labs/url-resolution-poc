/**
 * Studio entry point for `@sanity/routes`.
 *
 * Import from `@sanity/routes/studio` for Sanity Studio plugins, schema types,
 * and custom input components. Requires `react` and `sanity` as peer dependencies.
 *
 * **Not safe for RSC/server components.** Use `@sanity/routes` instead for framework code.
 *
 * @packageDocumentation
 * @module @sanity/routes/studio
 */
export {routesPlugin} from './plugin.js'
export type {RoutesPluginOptions} from './plugin.js'
export {routeConfig, routeMap, createRouteMapType} from './schema.js'
export {RouteEntryInput, DocumentTypePicker, PathExpressionField, SlugWithUrlPreview} from './components/index.js'
