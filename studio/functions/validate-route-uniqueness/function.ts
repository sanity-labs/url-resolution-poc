import {defineDocumentFunction} from '@sanity/blueprints'

export const validateRouteUniqueness = defineDocumentFunction({
  name: 'validate-route-uniqueness',
  title: 'Check for URL collisions on publish',
  on: ['publish'],
  filter: `_type in ["blogPost", "article"]`,
  includeDrafts: false,
})
