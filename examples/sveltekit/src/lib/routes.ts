import { createRouteResolver } from '@sanity/routes'
import { client } from './sanity'
import { SANITY_ROUTES_ENV } from '$env/static/private'

export const resolver = createRouteResolver(client, 'web', {
  environment: SANITY_ROUTES_ENV || 'production',
})
