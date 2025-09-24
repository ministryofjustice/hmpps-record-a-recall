import express, { Router } from 'express'
import { validate, populateValidationData } from '../../middleware/validationMiddleware'
import PersonSearchController from '../../controllers/search/personSearchController'
import { sessionModelAdapter } from '../../middleware/sessionModelAdapter'

/**
 * Sets up person search routes with validation
 */
function setupPersonSearchRoutes(router: Router): void {
  // TODO: Remove sessionModelAdapter once SessionManager is refactored to use Express sessions directly
  // This middleware bridges FormWizard's sessionModel with Express sessions during migration
  router.use(sessionModelAdapter)

  // Apply redirect check middleware to all search routes
  router.use(PersonSearchController.checkForRedirect)

  // Root search route - redirect to nomisId search
  router.get('/', (_req, res) => {
    res.redirect('/search/nomisId')
  })

  router.get('/nomisId', populateValidationData, PersonSearchController.get)

  router.post(
    '/nomisId',
    validate('personSearch'), // Validate using registered schema
    PersonSearchController.post,
  )
}

// Create router and apply routes
const router = express.Router({ mergeParams: true })
setupPersonSearchRoutes(router)

export default router
export { setupPersonSearchRoutes }
