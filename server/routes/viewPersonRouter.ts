import express, { Router } from 'express'
import { Services } from '../services'
import { Page } from '../services/auditService'
import logPageView from '../middleware/logPageView'
import viewPersonHome from '../controllers/person/viewPersonHomeController'
import viewSentenceBreakdown from '../controllers/person/viewSentenceBreakdownController'

export default function personRouter(services: Services): Router {
  const router = express.Router({ mergeParams: true })

  router.get('/', logPageView(services.auditService, Page.PERSON_HOME_PAGE), viewPersonHome)
  router.get('/sentences', logPageView(services.auditService, Page.VIEW_ALL_SENTENCES), viewSentenceBreakdown)
  router.get('/temporary', logPageView(services.auditService, Page.VIEW_ALL_SENTENCES), viewSentenceBreakdown)

  return router
}
