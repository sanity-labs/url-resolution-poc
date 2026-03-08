import { createRouteResolver } from '@sanity/routes'
import { client } from './sanity'

export const resolver = createRouteResolver(client, 'web', {
  environment: import.meta.env.VITE_SANITY_ROUTES_ENV || 'production',
})
