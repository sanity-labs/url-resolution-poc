import {defineDocumentFunction} from '@sanity/blueprints'

export const redirectOnSlugChange = defineDocumentFunction({
  name: 'redirect-on-slug-change',
  title: 'Create redirect on slug change',
  on: ['publish'],
  filter: `_type in ["blogPost", "article"]`,
  includeDrafts: false,
})
