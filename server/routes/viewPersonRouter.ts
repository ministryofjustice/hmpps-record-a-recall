import express, { Router } from 'express'
import { Services } from '../services'
import { Page } from '../services/auditService'
import logPageView from '../middleware/logPageView'
import viewPersonHome from '../controllers/person/viewPersonHomeController'
import viewSentenceBreakdown from '../controllers/person/viewSentenceBreakdownController'

export default function personRouter(services: Services): Router {
  const router = express.Router({ mergeParams: true })

  // Middleware for home page - needs prisoner + recalls + service definitions
  const fullPersonData = services.dataFlowService.createDataMiddleware({
    loadPrisoner: true,
    loadRecalls: true,
    loadServiceDefinitions: true,
  })

  // Middleware for sentence pages - just needs prisoner data
  const basicPersonData = services.dataFlowService.createDataMiddleware({
    loadPrisoner: true,
    loadRecalls: false,
    loadServiceDefinitions: false,
  })

  // Home page gets full data automatically loaded by middleware
  router.get('/', fullPersonData, logPageView(services.auditService, Page.PERSON_HOME_PAGE), viewPersonHome)

  // Sentence pages get basic data automatically loaded by middleware
  router.get(
    '/sentences',
    basicPersonData,
    logPageView(services.auditService, Page.VIEW_ALL_SENTENCES),
    viewSentenceBreakdown,
  )

  router.get(
    '/temporary',
    basicPersonData,
    logPageView(services.auditService, Page.VIEW_ALL_SENTENCES),
    viewSentenceBreakdown,
  )

  return router
}
