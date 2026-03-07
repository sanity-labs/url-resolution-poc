# @sanity/routes

## 0.0.1 (unreleased)

Initial proof of concept.

### Features

- Two-tier URL resolution: realtime (live GROQ) and static (pre-computed shards)
- `createRouteResolver()` with discriminated union types (`RealtimeRouteResolver` / `StaticRouteResolver`)
- `pathProjection()` — embed URL resolution directly in GROQ queries
- `resolveUrlById()` / `resolveUrlByIds()` — full URL resolution
- `resolvePathById()` / `resolvePathByIds()` — pathname-only resolution for Next.js
- `preload()` — load all routes for synchronous Portable Text link resolution
- `diagnose()` — debug why a document fails to resolve
- `resolveDocumentByUrl()` — reverse URL resolution (static mode)
- `getPath()` — standalone URL-to-pathname utility
- `routesPlugin()` — Sanity Studio plugin with schema types and custom components
- `routesPresentation()` — auto-generate Presentation tool config from routes
- `createRouteSyncHandler()` — Sanity Function handler for automatic route map updates
- `createSlugWithUrlPreview()` — Studio component showing resolved URL above slug input
- i18n locale support with per-locale route map shards
- Multiple environments with wildcard base URLs
- Schema validation (basePath, baseUrl, pathExpression)
- Three-layer error handling: silent null → warn → onResolutionError callback
- 3-way export split: `@sanity/routes` (RSC-safe), `./studio` (React), `./handler` (Functions)
