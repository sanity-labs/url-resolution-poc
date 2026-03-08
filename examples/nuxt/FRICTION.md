# Nuxt 3 Integration — Friction Log

Findings from integrating `@sanity/routes` with Nuxt 3 using `@nuxtjs/sanity` module.

## @nuxtjs/sanity Module — Centralized Config

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | Client setup | `@nuxtjs/sanity` centralizes Sanity config in `nuxt.config.ts` under `sanity: { ... }`. No manual `createClient()` calls needed. The module provides `useSanity()` composable (auto-imported in both app and server contexts) which exposes `.client` and `.fetch()`. Token is set via `runtimeConfig.sanity.token` / `NUXT_SANITY_TOKEN` env var. |

## Server Utils — Clean Pattern

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | Resolver setup | Nuxt's `server/utils/` auto-import is a natural fit. `useSanityClient()` wraps `useSanity().client` to provide the raw `@sanity/client` instance that `@sanity/routes` needs. `useRouteResolver()` is available everywhere in server code without explicit imports. Only package imports (`@sanity/routes`) need explicit `import` statements — Nuxt auto-imports handle the rest. |

## useSanity() — App + Server Contexts

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | Data fetching | `useSanity().client` is available in both app pages and server utils. Pages use `const { client } = useSanity()` for GROQ queries inside `useAsyncData`. Server utils use the same client via the `useSanityClient()` wrapper. Single source of truth for the Sanity client. |

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

## Token Env Var — Module Convention

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Low** | Environment variables | `@nuxtjs/sanity` uses `runtimeConfig.sanity.token` which maps to `NUXT_SANITY_TOKEN` env var. This differs from the manual setup (`NUXT_SANITY_READ_TOKEN` → `runtimeConfig.sanityReadToken`). The module convention is cleaner but means `.env` files aren't portable across examples. |

## groq Package — Transitive Dependency

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | `defineQuery()` | `groq` is a transitive dependency of `@nuxtjs/sanity`, so `import { defineQuery } from 'groq'` still works in `lib/queries.ts` without listing `groq` as a direct dependency. The module also auto-imports `defineQuery` and `groq` in Nuxt-processed files. |

## Overall

Nuxt with `@nuxtjs/sanity` is the **cleanest integration** so far. The module centralizes Sanity config, provides auto-imported composables for both app and server contexts, and eliminates manual `createClient()` boilerplate. Server utils auto-import, server middleware for redirects, `useAsyncData` for data fetching — everything has a natural home.

### Cross-Framework Comparison

| Framework | Resolver Setup | Data Loading | Redirects | Serializer | PT Links | Extra Files |
|-----------|---------------|-------------|-----------|------------|----------|-------------|
| Next.js | lib/ module | RSC (server) | middleware.ts | N/A (RSC) | JSX | 0 |
| SvelteKit | lib/ module | +page.server.ts | hooks.server.ts | devalue | Svelte context | 0 |
| React Router | lib/ module | loader (server) | entry.server.tsx | JSON | JSX | 0 |
| TanStack Start | lib/ module | createServerFn | beforeLoad | Custom | JSX | 1 (server-fns.ts) |
| **Nuxt** | **server/utils/** | **useAsyncData** | **server/middleware/** | **devalue** | **Vue h()** | **0** |
