import express from 'express'
import populateStoredRecallRouter from './populate-stored-recall'
import editSummaryRouter from './edit-summary'
import notPossibleRouter from '../not-possible'

const editRecallRouter = express.Router({ mergeParams: true })

// Handle base route - redirect to populate-stored-recall
editRecallRouter.get('/', (req, res) => {
  // Redirect to the populate-stored-recall step which loads the recall data
  res.redirect(`${req.baseUrl}/populate-stored-recall`)
})

// Mount edit routes
editRecallRouter.use(notPossibleRouter)
editRecallRouter.use(populateStoredRecallRouter)
editRecallRouter.use(editSummaryRouter)

// NOTE: Edit routes are progressively being migrated from HMPO form-wizard to Zod validation
// Currently migrated: populate-stored-recall, edit-summary
// Future migration: Form field editing routes will be added as needed

export default editRecallRouter
