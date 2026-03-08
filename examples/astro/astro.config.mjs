import { defineConfig } from 'astro/config'
import sanity from '@sanity/astro'

export default defineConfig({
  output: 'server',
  integrations: [
    sanity({
      projectId: 'bb8k7pej',
      dataset: 'production',
      apiVersion: '2026-03-01',
      useCdn: true,
    }),
  ],
})
