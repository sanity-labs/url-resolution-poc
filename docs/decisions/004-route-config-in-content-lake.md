# ADR-004: Route Config in Content Lake

**Status:** Accepted
**Date:** 2026-03-06
**Authors:** @lead, @developer, @educator, @knut

## Context

URL resolution rules are typically hardcoded in application code: switch statements, helper functions, or framework-specific route files. This means changing a URL structure requires a code deploy. It also means every consumer — the frontend, the MCP server, the CLI, the Studio — implements its own resolution logic, with inevitable drift between them.

The `@sanity/routes` package needs a single source of truth that all consumers can read, that non-engineers can inspect, and that can change without a deploy.

## Decision

Store route configuration as a `routes.config` document in the Content Lake. The schema type is registered by `routesPlugin()` — no manual schema wiring. The document is created in Studio or via a seed script.

**Two-tier architecture:**

```
Route Config (routes-config-web)     ← source of truth
  GROQ pathExpression per type
       │                    │
  realtime mode         static mode
       │                    │
  Resolver evaluates    Sync Function evaluates
  pathExpression live   pathExpression on publish
  (per-request)         → writes to Route Map
                              │
                         Route Map (routes-web-{type})
                         Pre-computed shard per type
                              │
                         Resolver reads shards
                         for preload(), sitemaps, PT links
```

The config document defines base URLs per environment (with wildcard support for PR previews), and a `routes` array mapping document types to a `basePath` and a GROQ `pathExpression`:

```json
{
  "_id": "routes-config-web",
  "_type": "routes.config",
  "channel": "web",
  "baseUrls": [
    { "name": "production", "url": "https://www.example.com", "isDefault": true },
    { "name": "development", "url": "http://localhost:3000" }
  ],
  "routes": [
    { "types": ["blogPost"], "basePath": "/blog", "pathExpression": "slug.current" },
    {
      "types": ["article"],
      "basePath": "/docs",
      "pathExpression": "coalesce(*[_type == \"docsNavSection\" && references(^._id)][0].slug.current + \"/\", \"\") + slug.current"
    }
  ]
}
```

Route map shards are `routes.map` documents with IDs like `routes-web-blogPost`. Each shard holds an array of `{ doc: reference, path: string }` entries for all published documents of that type.

**Why a schema type, not a deploy-time config?** An earlier version defined routes in TypeScript and deployed them via `deployRoutes()`. That added a build step, created a separate deploy workflow, and split the config across code and Content Lake. Making it a schema type eliminates all of that — the schema is in code (standard Sanity convention), the document lives in the Content Lake, and there's no deploy step.

## Consequences

- **Good:** URL structure changes without code deploys. All consumers (frontend, MCP, CLI) read from the same document. Config is versionable, queryable via GROQ, and visible in Studio. Realtime mode works immediately — no sync Function needed for basic resolution.
- **Neutral:** The `pathExpression` field contains GROQ, which is a developer concern. Content editors can see the document in Studio but shouldn't edit it. Role-based access or a dedicated structure section is recommended.
- **Bad:** The Content Lake is now a dependency for URL resolution. If the config document is deleted or corrupted, all resolution fails. The `pathExpression` field is a free-text GROQ string — no validation at write time.

## Alternatives Considered

**Config file in the repo:** A TypeScript or JSON file checked into the application. Simple, but requires a code deploy to change URL structure. Doesn't solve the multi-consumer drift problem.

**External database:** Store route config in Redis, Postgres, or a dedicated routing service. Another system to provision, monitor, and keep in sync with the Content Lake. Rejected — Sanity is already the system of record for content.

**Hardcoded in application code:** The status quo. Each consumer implements its own resolution. Rejected as the problem we're solving.
