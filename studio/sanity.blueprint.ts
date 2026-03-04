import { defineBlueprint } from '@sanity/blueprints'
import { routeSyncFunction } from './functions/route-sync/function'

export default defineBlueprint({
  resources: [routeSyncFunction],
})
