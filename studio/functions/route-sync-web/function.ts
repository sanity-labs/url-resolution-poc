import {defineDocumentFunction} from '@sanity/blueprints'

export const routeSyncFunction = defineDocumentFunction({
  name: 'route-sync-web',
  event: {
    on: ['create', 'update', 'delete'],
    filter: `_type in ["blogPost", "article", "docsNavSection"]`,
    projection: `{ _id, _type, slug }`,
  },
})
