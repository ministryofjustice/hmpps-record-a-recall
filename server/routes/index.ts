import type { RequestHandler } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import type { Services } from '../services'
import { Controller } from './controller'
import { SchemaFactory, validate } from '../middleware/validationMiddleware'
import CreateRecallRevocationDateController from './create/revocation-date/createRecallRevocationDateController'
import ApiRoutes from './prisonerImageRoute'
import StartCreateRecallJourneyController from './create/start/startCreateRecallJourneyController'
import { revocationDateSchemaFactory } from './common/revocation-date/revocationDateSchemas'
import { ensureInCreateRecallJourney } from '../middleware/journeyMiddleware'
import asyncMiddleware from '../middleware/asyncMiddleware'
import CreateRecallReturnToCustodyDateController from './create/return-to-custody-date/createRecallReturnToCustodyDateController'
import CreateRecallDecisionController from './create/decision/createRecallDecisionController'
import HomeController from './home/homeController'
import ManualJourneyInterceptController from './create/manual/start/manualJourneyInterceptController'
import SelectCasesController from './create/manual/select-cases/selectCasesController'
import { selectCourtCasesSchema } from './common/select-court-cases/selectCourtCasesSchema'
import CreateRecallReviewSentencesController from './create/automated/review-sentences/createRecallReviewSentencesController'
import CreateRecallTypeController from './create/recall-type/createRecallTypeController'
import { recallTypeSchema } from './common/recall-type/recallTypeSchema'
import ConfirmDeleteRecallController from './delete/confirmDeleteRecallController'
import { confirmDeleteRecallSchema } from './delete/confirmDeleteRecallSchema'
import CreateRecallCheckAnswersController from './create/check-answer/createRecallCheckAnswersController'
import CheckSentencesController from './create/manual/check-sentences/checkSentencesController'
import CreateRecallCriticalValidationController from './create/intercept/createRecallCriticalValidationController'
import CreateRecallConflictingAdjustmentsController from './create/intercept/createRecallConflictingAdjustmentsController'
import CreateRecallNoRecallableSentencesController from './create/intercept/createRecallNoRecallableSentencesController'
import CreateRecallConfirmationController from './create/confirmation/createRecallConfirmationController'
import auditPageViewMiddleware from '../middleware/auditPageViewMiddleware'
import { returnToCustodyDateSchemaFactory } from './common/return-to-custody-date/returnToCustodyDateSchemas'
import CreateRecallCancelController from './create/cancel/createRecallCancelController'
import { confirmCancelSchema } from './common/confirm-cancel/confirmCancelSchema'
import StartEditRecallJourneyController from './create/start/startEditRecallJourneyController'

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
    controller: new StartCreateRecallJourneyController(calculateReleaseDatesService),
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
    controller: new CreateRecallRevocationDateController(),
    validateToSchema: revocationDateSchemaFactory(recallService),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: `${journeyPath}/return-to-custody-date`,
    controller: new CreateRecallReturnToCustodyDateController(),
    validateToSchema: returnToCustodyDateSchemaFactory(),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: `${journeyPath}/recall-decision`,
    controller: new CreateRecallDecisionController(calculateReleaseDatesService),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: `${journeyPath}/review-sentences`,
    controller: new CreateRecallReviewSentencesController(recallService, calculateReleaseDatesService),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: `${journeyPath}/recall-type`,
    controller: new CreateRecallTypeController(),
    validateToSchema: recallTypeSchema,
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: `${journeyPath}/check-answers`,
    controller: new CreateRecallCheckAnswersController(recallService),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  // create - intercepts
  route({
    path: `${journeyPath}/validation-intercept`,
    controller: new CreateRecallCriticalValidationController(),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: `${journeyPath}/conflicting-adjustments`,
    controller: new CreateRecallConflictingAdjustmentsController(calculateReleaseDatesService, adjustmentsService),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: `${journeyPath}/no-recallable-sentences-found`,
    controller: new CreateRecallNoRecallableSentencesController(),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  // create - manual journey
  route({
    path: `${journeyPath}/manual/start`,
    controller: new ManualJourneyInterceptController(),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: `${journeyPath}/manual/select-court-cases`,
    controller: new SelectCasesController(recallService),
    validateToSchema: selectCourtCasesSchema,
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: `${journeyPath}/manual/select-court-cases/:caseIndex`,
    controller: new SelectCasesController(recallService),
    validateToSchema: selectCourtCasesSchema,
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: `${journeyPath}/manual/check-sentences`,
    controller: new CheckSentencesController(
      recallService,
      calculateReleaseDatesService,
      courtCasesReleaseDatesService,
    ),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: `${journeyPath}/confirm-cancel`,
    controller: new CreateRecallCancelController(),
    validateToSchema: confirmCancelSchema,
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/:createOrEdit/:recallId/confirmed',
    controller: new CreateRecallConfirmationController(),
  })

  // delete recall
  route({
    path: '/person/:nomsId/recall/:recallUuid/delete',
    controller: new ConfirmDeleteRecallController(recallService),
    validateToSchema: confirmDeleteRecallSchema,
  })

  return router
}
