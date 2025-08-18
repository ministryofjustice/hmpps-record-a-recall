import express from 'express'
import wizard from 'hmpo-form-wizard'

import steps from './steps'
import fields from './fields'

const newRecallRouter = express.Router({ mergeParams: true })

newRecallRouter.use(
  wizard(steps, fields, {
    name: 'record-recall',
    templatePath: 'pages/recall',
    csrf: false,
    checkJourney: false,
  }),
)
export default newRecallRouter
