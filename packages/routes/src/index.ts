// ─── Plugin ──────────────────────────────────────────────────────────
export {routesPlugin} from './plugin.js'

// ─── Schema ──────────────────────────────────────────────────────────
export {routeConfig} from './schema.js'

// ─── Resolver ────────────────────────────────────────────────────────
export {createRouteResolver} from './resolver.js'

// ─── Build ───────────────────────────────────────────────────────────
export {buildRouteMap} from './build.js'

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
