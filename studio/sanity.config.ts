import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { presentationTool } from 'sanity/presentation'
import { codeInput } from '@sanity/code-input'
import { routesPlugin, routesPresentation } from '@sanity/routes'
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
    presentationTool({
      previewUrl: {
        origin:
          process.env.SANITY_STUDIO_PREVIEW_ORIGIN ||
          (process.env.SANITY_STUDIO_VERCEL_GIT_COMMIT_REF
            ? `https://router-poc-nextjs-git-${process.env.SANITY_STUDIO_VERCEL_GIT_COMMIT_REF}.sanity.dev`
            : 'http://localhost:3000'),
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
