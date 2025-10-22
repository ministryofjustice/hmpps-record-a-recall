import express, { Router } from 'express'
import { validate, populateValidationData } from '../../middleware/validationMiddleware'
import PersonSearchController from '../../controllers/search/personSearchController'

/**
 * Sets up person search routes with validation
 */
function setupPersonSearchRoutes(router: Router): void {
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
