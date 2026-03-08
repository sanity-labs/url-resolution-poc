import { createRouteResolver } from '@sanity/routes'

export function useRouteResolver() {
  const config = useRuntimeConfig()
  const client = useSanityClient()

  return createRouteResolver(client, 'web', {
    environment: config.sanityRoutesEnv || 'production',
  })
}
