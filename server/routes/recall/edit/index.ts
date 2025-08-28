import express from 'express'
import wizard from 'hmpo-form-wizard'

import steps from './steps'
import populateRecallId from '../../../middleware/populateRecallId'
import editFields from './fields'
import populateStoredRecallRouter from './migrated/populate-stored-recall'

const editRecallRouter = express.Router({ mergeParams: true })

// Feature flag for Phase 7 - Edit Form Migration
const USE_MIGRATED_EDIT_ROUTES = process.env.USE_MIGRATED_EDIT_ROUTES === 'true'

editRecallRouter.use(populateRecallId())

if (USE_MIGRATED_EDIT_ROUTES) {
  // Mount migrated edit routes first - they take precedence
  editRecallRouter.use(populateStoredRecallRouter)
}

editRecallRouter.use(
  wizard(steps, editFields, {
    name: 'edit-recall',
    templatePath: 'pages/recall',
    csrf: false,
    checkJourney: false,
  }),
)
export default editRecallRouter
