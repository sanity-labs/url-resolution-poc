import { createClient } from '@sanity/client'
import { SANITY_READ_TOKEN } from '$env/static/private'

export const projectId = 'bb8k7pej'
export const dataset = 'production'
export const apiVersion = '2026-03-01'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  token: SANITY_READ_TOKEN || undefined,
})
