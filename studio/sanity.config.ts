import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { presentationTool } from 'sanity/presentation'
import { codeInput } from '@sanity/code-input'
import { routesPlugin } from '@sanity/routes/studio'
import { routesPresentation } from '@sanity/routes'
import { agentContextPlugin } from '@sanity/agent-context/studio'
import { schemaTypes } from './schemas'
import { structure } from './structure'

export default defineConfig({
  name: 'url-resolution-poc',
  title: 'URL Resolution POC',
  projectId: 'bb8k7pej',
  dataset: 'production',
  schema: {
    types: schemaTypes,
  },
  plugins: [
    structureTool({ structure }),
    routesPlugin({ types: ['article', 'blogPost'] }),
    codeInput(),
    agentContextPlugin(),
    presentationTool({
      previewUrl: {
        origin: process.env.SANITY_STUDIO_PREVIEW_ORIGIN || 'http://localhost:3000',
        preview: '/',
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
      resolve: routesPresentation('web', {
        mainDocuments: [
          { route: '/blog/:slug', filter: `_type == "blogPost" && slug.current == $slug` },
          { route: '/docs/:slug', filter: `_type == "article" && slug.current == $slug` },
          { route: '/docs/:section/:slug', filter: `_type == "article" && slug.current == $slug` },
        ],
      }),
    }),
  ],
})
