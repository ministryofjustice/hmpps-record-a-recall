import type { RequestHandler } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import type { Services } from '../services'
import { Controller } from './controller'
import { SchemaFactory, validate } from '../middleware/validationMiddleware'
import RevocationDateController from './journey/revocation-date/revocationDateController'
import ApiRoutes from './prisonerImageRoute'
import StartCreateRecallJourneyController from './journey/start/startCreateRecallJourneyController'
import { revocationDateSchemaFactory } from './journey/revocation-date/revocationDateSchemas'
import { ensureInRecallJourney } from '../middleware/journeyMiddleware'
import asyncMiddleware from '../middleware/asyncMiddleware'
import ReturnToCustodyDateController from './journey/return-to-custody-date/returnToCustodyDateController'
import DecisionController from './journey/decision/decisionController'
import HomeController from './home/homeController'
import ManualJourneyInterceptController from './journey/manual/start/manualJourneyInterceptController'
import SelectCasesController from './journey/manual/select-cases/selectCasesController'
import { selectCourtCasesSchema } from './journey/manual/select-cases/selectCourtCasesSchema'
import ReviewSentencesController from './journey/automated/reviewSentencesController'
import RecallTypeController from './journey/recall-type/recallTypeController'
import { recallTypeSchema } from './journey/recall-type/recallTypeSchema'
import ConfirmDeleteRecallController from './delete/confirmDeleteRecallController'
import { confirmDeleteRecallSchema } from './delete/confirmDeleteRecallSchema'
import CheckAnswersController from './journey/check-answer/checkAnswersController'
import CheckSentencesController from './journey/manual/check-sentences/checkSentencesController'
import CriticalValidationController from './journey/intercept/criticalValidationController'
import ConflictingAdjustmentsController from './journey/intercept/conflictingAdjustmentsController'
import NoRecallableSentencesController from './journey/intercept/noRecallableSentencesController'
import ConfirmationController from './journey/confirmation/confirmationController'
import auditPageViewMiddleware from '../middleware/auditPageViewMiddleware'
import { returnToCustodyDateSchemaFactory } from './journey/return-to-custody-date/returnToCustodyDateSchemas'
import CancelController from './journey/cancel/cancelController'
import { confirmCancelSchema } from './journey/cancel/confirmCancelSchema'
import StartEditRecallJourneyController from './journey/start/startEditRecallJourneyController'
import NoCasesSelectedController from './journey/manual/no-cases/noCasesSelectedController'
import UnexpectedRecallTypeController from './journey/intercept/unexpectedRecallTypeController'
import UnsupportedRecallTypeController from './journey/intercept/unsupportedRecallTypeController'
import UnknownPreRecallSentenceTypeController from './journey/intercept/unknownPreRecallSentenceTypeController'
import NoSentencesController from './journey/intercept/noSentencesController'

export default function routes({
  prisonerService,
  calculateReleaseDatesService,
  courtCasesReleaseDatesService,
  recallService,
  auditService,
  adjustmentsService,
}: Services): Router {
  const apiRoutes = new ApiRoutes(prisonerService)

  const router = Router()

  router.get('/', async (req, res) => {
    return res.render('pages/index')
  })
  router.get('/api/person/:nomsId/image', apiRoutes.personImage)

  const route = <P extends { [key: string]: string }>({
    path,
    controller,
    validateToSchema,
    additionalMiddleware = [],
  }: {
    path: string
    controller: Controller
    validateToSchema?: z.ZodTypeAny | SchemaFactory<P>
    additionalMiddleware?: (RequestHandler<P> | RequestHandler)[]
  }) => {
    const auditPageView = auditPageViewMiddleware(controller.PAGE_NAME, auditService)
    console.log('Routerrrrrr')
    router.get(path, auditPageView, ...additionalMiddleware, asyncMiddleware(controller.GET))
    if (controller.POST) {
      if (validateToSchema) {
        router.post(path, ...additionalMiddleware, validate(validateToSchema), asyncMiddleware(controller.POST))
      } else {
        router.post(path, ...additionalMiddleware, asyncMiddleware(controller.POST))
      }
    }
  }

  // dashboard
  route({
    path: '/person/:nomsId',
    controller: new HomeController(courtCasesReleaseDatesService, recallService),
  })

  // create recall
  route({
    path: '/person/:nomsId/recall/create/start',
    controller: new StartCreateRecallJourneyController(calculateReleaseDatesService, recallService),
  })
  // edit recall
  route({
    path: '/person/:nomsId/recall/edit/:recallId/start',
    controller: new StartEditRecallJourneyController(calculateReleaseDatesService, recallService),
  })

  // Common pages for edit and create
  const journeyPath = '/person/:nomsId/recall/:createOrEdit{/:recallId}/:journeyId'
  route({
    path: `${journeyPath}/revocation-date`,
    controller: new RevocationDateController(),
    validateToSchema: revocationDateSchemaFactory(recallService),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/return-to-custody-date`,
    controller: new ReturnToCustodyDateController(),
    validateToSchema: returnToCustodyDateSchemaFactory(),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/recall-decision`,
    controller: new DecisionController(calculateReleaseDatesService),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/review-sentences`,
    controller: new ReviewSentencesController(recallService, calculateReleaseDatesService),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/recall-type`,
    controller: new RecallTypeController(recallService),
    validateToSchema: recallTypeSchema,
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/check-answers`,
    controller: new CheckAnswersController(recallService),
    additionalMiddleware: [ensureInRecallJourney],
  })

  // intercepts
  route({
    path: `${journeyPath}/validation-intercept`,
    controller: new CriticalValidationController(),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/conflicting-adjustments`,
    controller: new ConflictingAdjustmentsController(calculateReleaseDatesService, adjustmentsService),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/no-recallable-sentences-found`,
    controller: new NoRecallableSentencesController(),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/unexpected-recall-type`,
    controller: new UnexpectedRecallTypeController(),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/unsupported-recall-type`,
    controller: new UnsupportedRecallTypeController(),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/unknown-pre-recall-sentence-type`,
    controller: new UnknownPreRecallSentenceTypeController(recallService),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `/person/:nomsId/recall/create/no-sentences`,
    controller: new NoSentencesController(),
  })

  // manual journey
  route({
    path: `${journeyPath}/manual/start`,
    controller: new ManualJourneyInterceptController(),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/manual/select-court-cases`,
    controller: new SelectCasesController(recallService),
    validateToSchema: selectCourtCasesSchema,
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/manual/select-court-cases/:caseIndex`,
    controller: new SelectCasesController(recallService),
    validateToSchema: selectCourtCasesSchema,
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/manual/no-cases-selected`,
    controller: new NoCasesSelectedController(),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/manual/check-sentences`,
    controller: new CheckSentencesController(
      recallService,
      calculateReleaseDatesService,
      courtCasesReleaseDatesService,
    ),
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: `${journeyPath}/confirm-cancel`,
    controller: new CancelController(),
    validateToSchema: confirmCancelSchema,
    additionalMiddleware: [ensureInRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/:createOrEdit/:recallId/confirmed',
    controller: new ConfirmationController(),
  })

  // delete recall
  route({
    path: '/person/:nomsId/recall/:recallUuid/delete',
    controller: new ConfirmDeleteRecallController(recallService),
    validateToSchema: confirmDeleteRecallSchema,
  })

  return router
}
