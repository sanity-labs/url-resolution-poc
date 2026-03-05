import {defineDocumentFunction} from '@sanity/blueprints'
import {defineRouteSyncBlueprint} from '@sanity/routes'

export const routeSyncFunction = defineDocumentFunction(
  defineRouteSyncBlueprint('web', {types: ['blogPost', 'article', 'docsNavSection']}),
)
