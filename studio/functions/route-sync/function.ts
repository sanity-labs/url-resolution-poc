import { defineDocumentFunction } from '@sanity/blueprints'

export const routeSyncFunction = defineDocumentFunction({
  name: 'route-sync',
  event: {
    on: ['create', 'update', 'delete'],
    filter: `_type in ["blogPost", "article"] && delta::changedAny(('slug', '_type'))`,
    projection: `{ _id, _type, slug }`,
  },
})
