import { createRouteResolver } from '@sanity/routes'
import { client } from './sanity.server'

export const resolver = createRouteResolver(client, 'web', {
  environment: process.env.SANITY_ROUTES_ENV || 'production',
})
