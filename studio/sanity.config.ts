import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { presentationTool } from 'sanity/presentation'
import { defineLocations } from 'sanity/presentation'
import { routesPlugin } from '@sanity/routes'
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
    routesPlugin(),
    presentationTool({
      previewUrl: {
        origin: process.env.SANITY_STUDIO_PREVIEW_ORIGIN || 'http://localhost:3000',
        preview: '/',
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
      resolve: {
        locations: {
          article: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: [
                { title: doc?.title || 'Untitled', href: `/docs/${doc?.slug}` },
              ],
            }),
          }),
          blogPost: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: [
                { title: doc?.title || 'Untitled', href: `/blog/${doc?.slug}` },
              ],
            }),
          }),
        },
        mainDocuments: [
          { route: '/blog/:slug', filter: `_type == "blogPost" && slug.current == $slug` },
          { route: '/docs/:slug', filter: `_type == "article" && slug.current == $slug` },
          { route: '/docs/:section/:slug', filter: `_type == "article" && slug.current == $slug` },
        ],
      },
    }),
  ],
})
