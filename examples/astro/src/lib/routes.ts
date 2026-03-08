import { createRouteResolver } from '@sanity/routes'
import { authenticatedClient } from './sanity'

export const resolver = createRouteResolver(authenticatedClient, 'web', {
  environment: import.meta.env.SANITY_ROUTES_ENV || 'production',
})
