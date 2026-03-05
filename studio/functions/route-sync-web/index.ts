// Relative import to the built package — avoids symlink issues with the function bundler
// In a published @sanity/routes package, this would be:
//   import {createRouteSyncHandler} from '@sanity/routes'
import {createRouteSyncHandler} from '../../../packages/routes/dist/handler.js'

export const handler = createRouteSyncHandler('web')
