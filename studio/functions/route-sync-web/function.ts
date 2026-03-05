import {defineDocumentFunction} from '@sanity/blueprints'
import {defineRouteSyncBlueprint} from '@sanity/routes'

// @ts-expect-error — RouteSyncBlueprint is structurally compatible but TypeScript can't verify the tuple type
export const routeSyncFunction = defineDocumentFunction(
  defineRouteSyncBlueprint('web', {types: ['blogPost', 'article', 'docsNavSection']}),
)
