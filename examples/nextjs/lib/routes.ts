import { createRouteResolver } from '@sanity/routes'
import { client } from './sanity'

// Unified resolver — all methods available on one instance
// resolveUrlById, pathProjection, listen use realtime GROQ evaluation
// preload, resolveDocumentByUrl, rebuildType use static shards (lazy loaded)
export const resolver = createRouteResolver(client, 'web', {
  environment: process.env.SANITY_ROUTES_ENV || 'production',
})
