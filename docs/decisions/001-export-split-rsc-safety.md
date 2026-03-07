# ADR-001: Export Split for RSC Safety

**Status:** Accepted
**Date:** 2026-03-06
**Authors:** @lead, @developer, @educator, @knut

## Context

The original `@sanity/routes` package had a single entry point that re-exported everything: resolver, Studio plugin, schema, components, and sync handler. This caused two problems. First, any Next.js Server Component importing `@sanity/routes` would fail — the module graph pulled in React and `sanity` peer dependencies, which are forbidden in RSC contexts. Second, TypeScript exposed `preload()` on realtime resolvers and `listen()` on static resolvers, both of which throw at runtime. There was no compile-time feedback.

These are distinct problems with a shared fix: split the package into entry points that match actual runtime boundaries.

## Decision

Three entry points, split by dependency profile:

```
@sanity/routes          → resolver, types, buildRouteMap, routesPresentation (RSC-safe, no React)
@sanity/routes/studio   → routesPlugin, schema, components (requires React + sanity)
@sanity/routes/handler  → createRouteSyncHandler, routeBlueprint (requires @sanity/functions)
```

`@sanity/routes/resolver` is kept as an alias for the main entry — some developers will look for it.

**package.json exports:**

```json
{
  "exports": {
    ".": { "types": "./dist/resolver.d.ts", "import": "./dist/resolver.js" },
    "./resolver": { "types": "./dist/resolver.d.ts", "import": "./dist/resolver.js" },
    "./studio": { "types": "./dist/studio.d.ts", "import": "./dist/studio.js" },
    "./handler": { "types": "./dist/handler.d.ts", "import": "./dist/handler.js" }
  }
}
```

**Discriminated resolver types via overloads.** `createRouteResolver` returns a `RealtimeRouteResolver` or `StaticRouteResolver` based on the `mode` option. TypeScript prevents calling wrong-mode methods at compile time:

```ts
// Default: realtime — no mode option needed
const resolver = createRouteResolver(client, 'web')
await resolver.resolveUrlById('my-doc')  // ✅
resolver.preload()                        // ❌ TypeScript error: Property 'preload' does not exist

// Opt-in: static — for sitemaps, SSG, PT link resolution
const staticResolver = createRouteResolver(client, 'web', { mode: 'static' })
await staticResolver.preload()            // ✅
staticResolver.listen()                   // ❌ TypeScript error: Property 'listen' does not exist
```

**Default mode is realtime.** It works immediately with no sync Function, no route map shards, and no setup. Static mode is an optimization you discover when you need `preload()` or bulk resolution.

**Migration:**

```ts
// Before
import { createRouteResolver, routesPlugin } from '@sanity/routes'

// After
import { createRouteResolver } from '@sanity/routes'           // RSC-safe
import { routesPlugin } from '@sanity/routes/studio'           // Studio only
import { createRouteSyncHandler } from '@sanity/routes/handler' // Functions only
```

## Consequences

- **Good:** Next.js Server Components can safely import `@sanity/routes`. TypeScript catches mode mismatches at compile time, not runtime. Each entry point has a clear dependency contract.
- **Neutral:** Import paths change — this is a breaking change requiring a major version bump or migration guide. The `./resolver` alias adds a small maintenance surface.
- **Bad:** Developers must know which entry point to use. The Studio plugin import is no longer co-located with the resolver import, which may surprise first-time users.

## Alternatives Considered

**Single entry with dynamic imports:** Lazy-load React-dependent code at runtime. Fragile — bundlers don't always tree-shake dynamic imports correctly, and RSC restrictions apply at module graph resolution time, not runtime.

**Two entry points (`@sanity/routes` + `@sanity/routes/studio`):** Keeps handler in the main entry. Rejected because `@sanity/functions` is a heavy dependency that shouldn't land in Next.js bundles.
