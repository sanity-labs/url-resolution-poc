import { createRouteResolver } from '@sanity/routes/resolver'
import { client } from './sanity'

// No token needed — route documents use hyphenated IDs (publicly readable)
// Static mode for PT link resolution via preload()
export const resolver = createRouteResolver(client, 'web', {
  mode: 'static',
  environment: process.env.SANITY_ROUTES_ENV || 'production',
})

// Realtime mode for dynamic resolution (groqField, resolveUrlById)
export const realtimeResolver = createRouteResolver(client, 'web', {
  mode: 'realtime',
  environment: process.env.SANITY_ROUTES_ENV || 'production',
})
