import express, { Router } from 'express'
import { Services } from '../services'
import { Page } from '../services/auditService'
import logPageView from '../middleware/logPageView'
import setupCommonData from '../middleware/setupCommonData'
import loadPrisoner from '../middleware/loadPrisoner'
import loadCourtCases from '../middleware/loadCourtCases'
import loadRecalls from '../middleware/loadRecalls'
import loadServiceDefinitions from '../middleware/loadServiceDefinitions'
import viewPersonHome from '../controllers/person/viewPersonHomeController'
import viewSentenceBreakdown from '../controllers/person/viewSentenceBreakdownController'
import DeleteRecallController from '../controllers/recall/deleteRecallController'
import asyncMiddleware from '../middleware/asyncMiddleware'
import populateRecallId from '../middleware/populateRecallId'

export default function personRouter(services: Services): Router {
  const router = express.Router({ mergeParams: true })
  const deleteRecallController = new DeleteRecallController(services)

  // Home page gets full data: prisoner + recalls + service definitions
  router.get(
    '/',
    setupCommonData(),
    loadPrisoner(services.prisonerService),
    loadRecalls(
      services.recallService,
      services.prisonService,
      services.manageOffencesService,
      services.courtCaseService,
      services.courtService,
    ),
    loadServiceDefinitions(services.courtCasesReleaseDatesService),
    logPageView(services.auditService, Page.PERSON_HOME_PAGE),
    viewPersonHome,
  )

  // Sentence pages get basic data: just prisoner data
  router.get(
    '/sentences',
    setupCommonData(),
    loadPrisoner(services.prisonerService),
    loadCourtCases(
      services.courtCaseService,
      services.manageOffencesService,
      services.courtService,
      services.calculationService,
      services.nomisMappingService,
    ),
    logPageView(services.auditService, Page.VIEW_ALL_SENTENCES),
    viewSentenceBreakdown,
  )

  router.get(
    '/temporary',
    setupCommonData(),
    loadPrisoner(services.prisonerService),
    loadCourtCases(
      services.courtCaseService,
      services.manageOffencesService,
      services.courtService,
      services.calculationService,
      services.nomisMappingService,
    ),
    logPageView(services.auditService, Page.VIEW_ALL_SENTENCES),
    viewSentenceBreakdown,
  )

  // Delete recall routes
  router.get(
    '/recall/:recallId/delete',
    setupCommonData(),
    loadPrisoner(services.prisonerService),
    populateRecallId(),
    asyncMiddleware(deleteRecallController.get.bind(deleteRecallController)),
  )

  router.post(
    '/recall/:recallId/delete',
    setupCommonData(),
    loadPrisoner(services.prisonerService),
    populateRecallId(),
    asyncMiddleware(deleteRecallController.post.bind(deleteRecallController)),
  )

  return router
}
