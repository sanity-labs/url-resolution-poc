import { defineDocumentFunction } from '@sanity/blueprints'

export const routeSyncFunction = defineDocumentFunction({
  name: 'route-sync',
  event: {
    on: ['create', 'update', 'delete'],
    filter: `_type in ["blogPost", "article"]`,
    projection: `{ _id, _type, slug }`,
  },
})
