import express from 'express'
import wizard from 'hmpo-form-wizard'

import steps from './steps'
import fields from './fields'
import notPossibleRouter from './migrated/not-possible'
import confirmCancelRouter from './migrated/confirm-cancel'
import revocationDateRouter from './migrated/revocation-date'
import rtcDateRouter from './migrated/rtc-date'
import checkSentencesRouter from './migrated/check-sentences'

const newRecallRouter = express.Router({ mergeParams: true })

// Feature flag for gradual migration rollout
const USE_MIGRATED_ROUTES = process.env.USE_MIGRATED_ROUTES === 'true'
const USE_MIGRATED_DATE_ROUTES = process.env.USE_MIGRATED_DATE_ROUTES === 'true'
const USE_MIGRATED_COMPLEX_ROUTES = process.env.USE_MIGRATED_COMPLEX_ROUTES === 'true'

if (USE_MIGRATED_ROUTES) {
  // Mount migrated routes first - they take precedence
  newRecallRouter.use(notPossibleRouter)
  newRecallRouter.use(confirmCancelRouter)
}

if (USE_MIGRATED_DATE_ROUTES) {
  // Mount migrated date input routes - Phase 5
  newRecallRouter.use(revocationDateRouter)
  newRecallRouter.use(rtcDateRouter)
}

if (USE_MIGRATED_COMPLEX_ROUTES) {
  // Mount migrated complex business logic routes - Phase 6
  newRecallRouter.use(checkSentencesRouter)
}

newRecallRouter.use(
  wizard(steps, fields, {
    name: 'record-recall',
    templatePath: 'pages/recall',
    csrf: false,
    checkJourney: false,
  }),
)
export default newRecallRouter
