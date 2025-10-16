import { RequestHandler, Router } from 'express'

import { Page } from '../services/auditService'
import logPageView from '../middleware/logPageView'
import addBreadcrumb from '../middleware/addBreadcrumb'
import ApiRoutes from './apiRoutes'
import searchRouter from './search'
import v2RecallFlowRouter from '../controllers/recall'
import v2EditRecallRouter from '../controllers/recall/edit'
import addServicesToRequest from '../middleware/addServicesToRequest'
import { Services } from '../services'
import asyncMiddleware from '../middleware/asyncMiddleware'
import viewPersonRouter from './viewPersonRouter'
import populateNomisId from '../middleware/populateNomisId'
import bulkTestRouter from './bulkTestRouter'
import populateRecallId from '../middleware/populateRecallId'
import loadCourtCases from '../middleware/loadCourtCases'
import loadRecalls from '../middleware/loadRecalls'
import { invalidateWorkflowCache } from '../middleware/cacheInvalidation'

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
  router.use('/person/:nomisId', populateNomisId(), viewPersonRouter(services))
  // Main recall flow route (V2)
  router.use(
    '/person/:nomisId/record-recall',
    populateNomisId(),
    invalidateWorkflowCache(),
    loadCourtCases(
      services.courtCaseService,
      services.manageOffencesService,
      services.courtService,
      services.calculationService,
      services.nomisMappingService,
    ),
    loadRecalls(
      services.recallService,
      services.prisonService,
      services.manageOffencesService,
      services.courtCaseService,
      services.courtService,
    ),
    v2RecallFlowRouter(),
  )
  // Edit recall flow route (V2)
  router.use(
    '/person/:nomisId/edit-recall/:recallId',
    populateNomisId(),
    populateRecallId(),
    invalidateWorkflowCache(),
    loadCourtCases(
      services.courtCaseService,
      services.manageOffencesService,
      services.courtService,
      services.calculationService,
      services.nomisMappingService,
    ),
    loadRecalls(
      services.recallService,
      services.prisonService,
      services.manageOffencesService,
      services.courtCaseService,
      services.courtService,
    ),
    v2EditRecallRouter(),
  )
  router.use('/bulk', bulkTestRouter(services))

  return router
}
