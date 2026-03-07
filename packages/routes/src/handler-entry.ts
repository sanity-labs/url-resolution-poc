/**
 * Functions entry point for `@sanity/routes`.
 *
 * Import from `@sanity/routes/handler` for Sanity Function handlers and blueprints.
 * Requires `@sanity/functions` as a peer dependency.
 *
 * @packageDocumentation
 * @module @sanity/routes/handler
 */
export {createRouteSyncHandler} from './handler.js'
export {defineRouteSyncBlueprint} from './blueprint.js'
export type {BlueprintOptions} from './types.js'
