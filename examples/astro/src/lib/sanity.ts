import { createClient } from '@sanity/client'

/**
 * Authenticated Sanity client for accessing private documents.
 * Route map shards have dots in their IDs (e.g., routes.web.article),
 * making them private documents that require a token.
 */
export const authenticatedClient = createClient({
  projectId: 'bb8k7pej',
  dataset: 'production',
  apiVersion: '2026-03-01',
  useCdn: false,
  token: import.meta.env.SANITY_API_READ_TOKEN || undefined,
})
