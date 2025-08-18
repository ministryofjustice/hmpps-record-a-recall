import express from 'express'
import wizard from 'hmpo-form-wizard'

import steps from './steps'
import populateRecallId from '../../../middleware/populateRecallId'
import editFields from './fields'

const editRecallRouter = express.Router({ mergeParams: true })

editRecallRouter.use(
  populateRecallId(),
  wizard(steps, editFields, {
    name: 'edit-recall',
    templatePath: 'pages/recall',
    csrf: false,
    checkJourney: false,
  }),
)
export default editRecallRouter
