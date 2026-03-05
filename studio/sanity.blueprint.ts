import { defineBlueprint } from '@sanity/blueprints'
import { routeSyncFunction } from './functions/route-sync-web/function'

export default defineBlueprint({
  resources: [routeSyncFunction],
})
