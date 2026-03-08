# Nuxt 3 Integration — Friction Log

Findings from integrating `@sanity/routes` with Nuxt 3 (fifth framework example, first Vue-based).

## Server Utils — Clean Pattern

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | Resolver setup | Nuxt's `server/utils/` auto-import is a natural fit. `useSanityClient()` and `useRouteResolver()` are available everywhere in server code without imports. Cleanest setup of any framework so far. |

## useAsyncData — Right Composable

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | Data fetching | `useAsyncData` (not `useFetch`) is the correct choice for calling the Sanity client directly. `useFetch` is for HTTP requests. The distinction is clear in Nuxt docs but could trip up developers who reach for `useFetch` first. |

## Server Middleware — Perfect Redirect Hook

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | `getRedirects()` | `server/middleware/redirects.ts` runs on every request, exactly like SvelteKit's `hooks.server.ts`. `sendRedirect(event, destination, statusCode)` is a one-liner. Cleanest redirect integration of any framework. |

## Portable Text — Vue h() Render Functions

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Medium** | PT internal links | `@portabletext/vue` uses Vue's `h()` render function for custom marks, not JSX or `<template>`. The mark component signature `({ value }, { slots })` differs from React's `({ value, children })`. Developers familiar with React PT will need to learn the Vue `h()` + slots pattern. Not a friction with `@sanity/routes` itself, but with the Vue PT ecosystem. |

## Serialization — devalue Handles Everything

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | `preload()` return type | Nuxt uses devalue (same as SvelteKit) for SSR payload serialization. Supports `Map`, `Set`, `Date`, `BigInt` natively. `Record<string, string>` works perfectly, and `Map` would have worked too. The Map→Record change was driven by React Router/TanStack Start (JSON serializers), not by Nuxt/SvelteKit (devalue serializers). |

## runtimeConfig — Env Var Mapping

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Low** | Environment variables | Nuxt auto-maps `NUXT_*` env vars to `runtimeConfig`. So `NUXT_SANITY_READ_TOKEN` maps to `runtimeConfig.sanityReadToken`. The naming convention is different from other frameworks (`SANITY_READ_TOKEN`). Minor but means `.env` files aren't portable across examples. |

## Auto-Imports — No Conflict

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | `defineQuery()` | Explicit `import { defineQuery } from 'groq'` takes precedence over Nuxt auto-imports. No naming conflicts despite Nuxt's `define*` convention. |

## Overall

Nuxt is the **cleanest integration** so far. Server utils auto-import, server middleware for redirects, `useAsyncData` for data fetching — everything has a natural home. The only friction is Vue-specific (PT `h()` render functions), not `@sanity/routes`-specific.

### Cross-Framework Comparison

| Framework | Resolver Setup | Data Loading | Redirects | Serializer | PT Links | Extra Files |
|-----------|---------------|-------------|-----------|------------|----------|-------------|
| Next.js | lib/ module | RSC (server) | middleware.ts | N/A (RSC) | JSX | 0 |
| SvelteKit | lib/ module | +page.server.ts | hooks.server.ts | devalue | Svelte context | 0 |
| React Router | lib/ module | loader (server) | entry.server.tsx | JSON | JSX | 0 |
| TanStack Start | lib/ module | createServerFn | beforeLoad | Custom | JSX | 1 (server-fns.ts) |
| **Nuxt** | **server/utils/** | **useAsyncData** | **server/middleware/** | **devalue** | **Vue h()** | **0** |
