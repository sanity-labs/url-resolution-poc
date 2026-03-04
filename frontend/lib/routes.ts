import { createRouteResolver } from '@sanity/routes/resolver'
import { client } from './sanity'

// Create a server-side client with token for accessing private route map shards
const tokenClient = client.withConfig({
  token: process.env.SANITY_API_READ_TOKEN || process.env.SANITY_READ_TOKEN,
  useCdn: false,
})

// Static mode for PT link resolution via preload()
export const resolver = createRouteResolver(tokenClient, 'web', {
  mode: 'static',
  environment: process.env.SANITY_ROUTES_ENV || 'production',
})

// Realtime mode for dynamic resolution
export const realtimeResolver = createRouteResolver(tokenClient, 'web', {
  mode: 'realtime',
  environment: process.env.SANITY_ROUTES_ENV || 'production',
})
