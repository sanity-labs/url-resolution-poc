// ─── Plugin ──────────────────────────────────────────────────────────
export {routesPlugin} from './plugin.js'
export type {RoutesPluginOptions} from './plugin.js'

// ─── Presentation ────────────────────────────────────────────────────
export {routesPresentation} from './presentation.js'
export type {RoutesPresentationOptions} from './presentation.js'

// ─── Schema ──────────────────────────────────────────────────────────
export {routeConfig, routeMap, createRouteMapType} from './schema.js'

// ─── Components ──────────────────────────────────────────────────────
export {RouteEntryInput, DocumentTypePicker, PathExpressionField} from './components/index.js'

// ─── Resolver ────────────────────────────────────────────────────────
export {createRouteResolver} from './resolver.js'

// ─── Build ───────────────────────────────────────────────────────────
export {buildRouteMap} from './build.js'

// ─── Handler ─────────────────────────────────────────────────────────
export {createRouteSyncHandler} from './handler.js'

// ─── Blueprint ───────────────────────────────────────────────────────
export {defineRouteSyncBlueprint} from './blueprint.js'
export type {RouteSyncBlueprint} from './blueprint.js'

// ─── Types ───────────────────────────────────────────────────────────
export type {
  RoutesConfig,
  BaseUrlEntry,
  RouteEntry,
  RouteMapShard,
  RouteMapEntry,
  RouteResolver,
  ResolverMode,
  ResolverOptions,
  BuildResult,
  BlueprintOptions,
} from './types.js'
