# React Router v7 Integration — Friction Log

Findings from integrating `@sanity/routes` with React Router v7 (framework mode).

## Map Serialization — CONFIRMED

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **High** | `preload()` return type | `preload()` returns `Map<string, string>`. React Router serializes loader data as JSON. `Map` does not JSON-serialize — it becomes `{}`. **Must use `Object.fromEntries(urlMap)` in every loader.** This confirms the SvelteKit friction log finding: `Record<string, string>` would be universally portable. |

## PT Component — Record vs Map

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Low** | PT internal links | The Next.js example uses `urlMap.get(ref)` (Map API). The React Router example uses `urlMap[ref]` (object property access). Same pattern, different syntax. The PT component must be written differently depending on whether the framework preserves Maps. |

## Redirect Integration

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Low** | `getRedirects()` | `cacheTtl` option works perfectly in `entry.server.tsx`. No manual caching needed. The `FrameworkRedirect` shape (`source`/`destination`) maps cleanly to React Router's redirect pattern. |

## Overall

The `@sanity/routes` API works in React Router v7 but the Map→Record conversion is mandatory boilerplate in every loader. This is the strongest signal yet that `preload()` should return `Record<string, string>` instead of `Map<string, string>`.
