# SPA Integration — Friction Log

Findings from integrating `@sanity/routes` with a pure client-side SPA (Vite + React Router, seventh framework example).

## No Token Required — Cleanest Auth Story

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | Authentication | Route map shard IDs use hyphens (`routes-web-article`), making them public documents. No token needed for `preload()` or any resolver method. This is the only example that works with zero secrets. |

## Client-Side Redirects — Different Pattern

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Low** | `getRedirects()` | No server middleware available. Redirects checked in the root route loader on every navigation. `cacheTtl: 60_000` prevents re-fetching on every route change. Works but redirects happen after the page starts loading (client-side), not before (server-side). Users may see a flash. |

## No Sitemap — Expected Limitation

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Low** | Sitemap generation | No server to render XML. SPAs typically rely on pre-rendering or external sitemap generation. Not a `@sanity/routes` limitation — it's a SPA constraint. |

## Loaders Run Client-Side — No Serialization Boundary

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | `preload()` return type | React Router loaders in SPA mode run in the browser. `Record<string, string>` from `preload()` is used directly — no serialization step. Same as Astro (no boundary), unlike framework-mode React Router (JSON serialization). |

## All Data Public — No Server Needed

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | Data fetching | Every query runs in the browser with `useCdn: true`. Content, route config, and route map shards are all publicly readable. The `@sanity/routes` API works identically to server-side usage — no client-specific code paths needed. |

## Overall

The SPA is the **most constrained but simplest** integration. Zero tokens, zero server code, zero env vars required. The `@sanity/routes` API works identically in the browser — the only difference is redirects happen client-side (flash possible) and there's no sitemap generation.

### Cross-Framework Comparison (Updated)

| Framework | Resolver Setup | Data Loading | Redirects | Serializer | PT Links | Token Required |
|-----------|---------------|-------------|-----------|------------|----------|----------------|
| Next.js | lib/ module | RSC (server) | middleware.ts | N/A (RSC) | JSX | Yes (live) |
| SvelteKit | lib/ module | +page.server.ts | hooks.server.ts | devalue | Svelte context | No |
| React Router v7 | lib/ module | loader (server) | entry.server.tsx | JSON | JSX | No |
| TanStack Start | lib/ module | createServerFn | beforeLoad | Custom | JSX | No |
| Nuxt | server/utils/ | useAsyncData | server/middleware/ | devalue | Vue h() | No |
| Astro | lib/ module | frontmatter | middleware.ts | None | Astro slots | Yes (shards) |
| **SPA** | **lib/ module** | **loader (client)** | **root loader** | **None** | **JSX** | **No** |
