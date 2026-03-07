/**
 * RSC-safe entry point for `@sanity/routes`.
 *
 * Import from `@sanity/routes` or `@sanity/routes/resolver` for framework code
 * (Next.js Server Components, API routes, build scripts). This entry point has
 * zero React or `sanity` dependencies.
 *
 * @packageDocumentation
 * @module @sanity/routes
 */
export {createRouteResolver} from './resolver.js'
export {buildRouteMap} from './build.js'
export {routesPresentation} from './presentation.js'
export {getPath} from './get-path.js'
export type {RoutesPresentationOptions} from './presentation.js'
export type {
  RoutesConfig,
  BaseUrlEntry,
  RouteEntry,
  RouteMapShard,
  RouteMapEntry,
  RouteResolver,
  // Deprecated aliases
  BaseRouteResolver,
  StaticRouteResolver,
  RealtimeRouteResolver,
  ResolverOptions,
  LocaleOptions,
  BuildResult,
  DiagnosisStatus,
  DiagnosisResult,
} from './types.js'
