import { createClient } from '@sanity/client'

export function useSanityClient() {
  const config = useRuntimeConfig()

  return createClient({
    projectId: 'bb8k7pej',
    dataset: 'production',
    apiVersion: '2026-03-01',
    useCdn: true,
    token: config.sanityReadToken || undefined,
  })
}
