import {defineBlueprint} from '@sanity/blueprints'
import {routeSyncFunction} from './functions/route-sync-web/function'
import {redirectOnSlugChange} from './functions/redirect-on-slug-change/function'

export default defineBlueprint({
  resources: [routeSyncFunction, redirectOnSlugChange],
})
