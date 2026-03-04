import { createClient } from '@sanity/client'

export const client = createClient({
  projectId: 'bb8k7pej',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
  token: process.env.SANITY_READ_TOKEN,
})
