import { RequestHandler, Router } from 'express'

import { Page } from '../services/auditService'
import logPageView from '../middleware/logPageView'
import addBreadcrumb from '../middleware/addBreadcrumb'
import ApiRoutes from './apiRoutes'
import searchRouter from './search'
import recallRouter from './recall'
import addServicesToRequest from '../middleware/addServicesToRequest'
import { Services } from '../services'
import asyncMiddleware from '../middleware/asyncMiddleware'
import viewPersonRouter from './viewPersonRouter'
import populateNomisId from '../middleware/populateNomisId'
import bulkTestRouter from './bulkTestRouter'
import populateEntrypoint from '../middleware/populateEntrypoint'

export default function routes(services: Services): Router {
  const router = Router()
  const get = (path: string | string[], ...handlers: RequestHandler[]) =>
    router.get(path, ...handlers.map(handler => asyncMiddleware(handler)))
  const apiRoutes = new ApiRoutes(services.prisonerService)
  get('/api/person/:nomsId/image', apiRoutes.personImage)

  router.use(addBreadcrumb({ title: 'Record a Recall', href: '/' }))

  // Apply middleware to log page views before handling the route
  router.get('/', logPageView(services.auditService, Page.INDEX), async (req, res, next) => {
    res.redirect('search')
  })

  router.use(addServicesToRequest(services))
  router.use('/search', searchRouter)
  router.use('/person/:nomisId?', populateNomisId(), viewPersonRouter(services))
  // HMPO Forms defined route
  router.use('/person/:nomisId/recall', populateEntrypoint(), populateNomisId(), recallRouter)
  router.use('/bulk', bulkTestRouter(services))

  return router
}
