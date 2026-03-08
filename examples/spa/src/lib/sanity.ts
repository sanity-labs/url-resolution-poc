import { createClient } from '@sanity/client'

export const projectId = import.meta.env.VITE_SANITY_PROJECT_ID || 'bb8k7pej'
export const dataset = import.meta.env.VITE_SANITY_DATASET || 'production'
export const apiVersion = '2026-03-01'

/**
 * Public Sanity client — no token, CDN enabled.
 * Safe for browser use. Route map shard IDs use hyphens (public docs).
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
})
