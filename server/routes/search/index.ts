import express from 'express'
import wizard from 'hmpo-form-wizard'

import steps from './steps'
import fields from './fields'
import migratedSearchRoute from './migrated/search-route'

const router = express.Router({ mergeParams: true })

// Feature flag for gradual rollout
if (process.env.USE_MIGRATED_SEARCH === 'true') {
  // Use the new Zod-based search route
  router.use(migratedSearchRoute)
} else {
  // Use the legacy HMPO wizard
  router.use(
    wizard(steps, fields, {
      name: 'search',
      templatePath: 'pages/search',
      csrf: false,
    }),
  )
}

export default router
