import express, { Router } from 'express'
import { Services } from '../services'
import { Page } from '../services/auditService'
import logPageView from '../middleware/logPageView'
import BulkTestController from '../controllers/bulk/bulkTestController'

export default function bulkTestRouter(services: Services): Router {
  const router = express.Router({ mergeParams: true })

  const controller = new BulkTestController(services.bulkCalculationService, services.prisonerService)

  router.get('/', logPageView(services.auditService, Page.BULK_TEST_PAGE), controller.bulkTest)

  router.post('/', controller.submitBulkCalc)

  return router
}
