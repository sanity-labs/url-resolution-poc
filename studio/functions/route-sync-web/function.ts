import {defineDocumentFunction} from '@sanity/blueprints'
import {defineRouteSyncBlueprint} from '@sanity/routes/handler'

export const routeSyncFunction = defineDocumentFunction(
  defineRouteSyncBlueprint('web', {types: ['blogPost', 'article', 'docsNavSection']}),
)
