import express from 'express'
import { validate, populateValidationData } from '../../middleware/validationMiddleware'
import PersonSearchController from '../../controllers/search/personSearchController'

const router = express.Router({ mergeParams: true })

// Apply redirect check middleware to all search routes
router.use(PersonSearchController.checkForRedirect)

// Root search route - redirect to nomisId search
router.get('/', (req, res) => {
  res.redirect('/search/nomisId')
})

// NOMIS ID search page
router.get(
  '/nomisId',
  populateValidationData, // Populates errors from session
  PersonSearchController.get
)

// Handle NOMIS ID search submission
router.post(
  '/nomisId',
  validate('personSearch', {
    mergeToSession: true,
    redirectOnError: req => req.originalUrl,
    businessRules: async (data, req) => {
      // Business validation happens in the controller
      // This is just for the schema validation
      return null
    },
  }),
  PersonSearchController.post
)

export default router
