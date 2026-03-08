# React Router v7 Integration — Friction Log

Findings from integrating `@sanity/routes` with React Router v7 (framework mode).

## Map Serialization — CONFIRMED → RESOLVED

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| ~~**High**~~ **Resolved** | `preload()` return type | Originally `preload()` returned `Map<string, string>`, which doesn't JSON-serialize (becomes `{}`). Required `Object.fromEntries(urlMap)` in every loader. **Fixed in PR #24** — `preload()` now returns `Record<string, string>`, which JSON-serializes natively. No conversion needed. |

## PT Component — Consistent API

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Resolved** | PT internal links | After PR #24, all frameworks use `urlMap[ref]` (property access). No more framework-dependent Map vs Record syntax. |

## Redirect Integration

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Low** | `getRedirects()` | `cacheTtl` option works perfectly in `entry.server.tsx`. No manual caching needed. The `FrameworkRedirect` shape (`source`/`destination`) maps cleanly to React Router's redirect pattern. |

## Overall

The friction log → API improvement loop worked: this example identified the Map serialization problem, which was fixed in PR #24 before this example shipped. All loaders now use `preload()` directly without conversion.
