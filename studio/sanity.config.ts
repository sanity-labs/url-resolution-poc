import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { routesPlugin } from '@sanity/routes'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'url-resolution-poc',
  title: 'URL Resolution POC',
  projectId: 'bb8k7pej',
  dataset: 'production',
  schema: {
    types: schemaTypes,
  },
  plugins: [
    structureTool(),
    routesPlugin(),
  ],
})
