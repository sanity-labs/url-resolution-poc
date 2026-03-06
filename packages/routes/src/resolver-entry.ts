// RSC-safe entry point — no React or sanity dependencies
export {createRouteResolver} from './resolver.js'
export {buildRouteMap} from './build.js'
export {routesPresentation} from './presentation.js'
export type {RoutesPresentationOptions} from './presentation.js'
export type {
  RoutesConfig,
  BaseUrlEntry,
  RouteEntry,
  RouteMapShard,
  RouteMapEntry,
  BaseRouteResolver,
  StaticRouteResolver,
  RealtimeRouteResolver,
  RouteResolver,
  ResolverMode,
  ResolverOptions,
  LocaleOptions,
  BuildResult,
} from './types.js'
