# TanStack Start Integration — Friction Log

Findings from integrating `@sanity/routes` with TanStack Start (fourth framework example).

## Serialization — Record Works Natively

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | `preload()` return type | TanStack Start uses a custom lightweight serializer that does NOT support `Map`. `Record<string, string>` serializes perfectly across the server function boundary. The Map→Record change (PR #24) was validated before this example — zero friction here. |

## Server Functions — Extra Indirection Layer

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Medium** | Data loading | TanStack Start loaders are **isomorphic** — they run on both server and client. This means `process.env.SANITY_READ_TOKEN` would leak to the client bundle if used directly in a loader. Must wrap all Sanity client calls in `createServerFn()` and call those from loaders. This adds an extra file (`server-fns.ts`) that other frameworks don't need. React Router loaders are server-only. SvelteKit `+page.server.ts` is server-only. TanStack Start is the only framework requiring this indirection. |

## Redirect Handling — No Server Entry Point

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Medium** | `getRedirects()` | TanStack Start doesn't have an equivalent to React Router's `entry.server.tsx` or SvelteKit's `hooks.server.ts` for intercepting all requests. Redirects must be handled per-route via `beforeLoad` or via a global middleware. Used `beforeLoad` on the root route with `checkRedirect` server function. Works but feels less clean than a single entry point. |

## Catch-All Routes — Different Param Name

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Low** | Docs route (`/docs/*`) | TanStack Router uses `_splat` as the param name for catch-all routes (vs React Router's `*` and SvelteKit's `params.path`). Minor difference, but means the docs route handler differs slightly across frameworks. |

## TypeGen — Same Pattern as React Router

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | `defineQuery()` | Uses `groq` package for `defineQuery()`, same as React Router. `SanityQueries` module augmentation works identically. No framework-specific friction. |

## Overall

TanStack Start is the most opinionated about server/client boundaries. The `createServerFn()` requirement adds boilerplate but provides clear guarantees about what runs where. The `@sanity/routes` API works cleanly — `Record` return type, `cacheTtl` for redirects, typed queries via TypeGen. The main friction is architectural: needing a `server-fns.ts` layer that other frameworks don't require.

### Friction Summary

| Framework | Server Functions Needed | Redirect Hook | Map→Record | Extra Files |
|-----------|----------------------|---------------|------------|-------------|
| Next.js | No (RSC) | middleware.ts | N/A (RSC) | 0 |
| SvelteKit | No (+page.server.ts) | hooks.server.ts | No (devalue) | 0 |
| React Router | No (server loaders) | entry.server.tsx | Resolved (PR #24) | 0 |
| TanStack Start | **Yes (createServerFn)** | **beforeLoad** | No (Record) | **1 (server-fns.ts)** |
