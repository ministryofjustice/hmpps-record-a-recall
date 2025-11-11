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
import CreateManualRecallTypeController from './create/manual/recall-type/createManualRecallTypeController'
import auditPageViewMiddleware from '../middleware/auditPageViewMiddleware'
import { returnToCustodyDateSchemaFactory } from './common/return-to-custody-date/returnToCustodyDateSchemas'
import CreateManualRecallCheckAnswersController from './create/manual/check-answers/createManualRecallCheckAnswersController'
import CreateRecallCancelController from './create/cancel/createRecallCancelController'
import { confirmCancelSchema } from './common/confirm-cancel/confirmCancelSchema'

export default function routes({
  prisonerService,
  calculateReleaseDatesService,
  courtCasesReleaseDatesService,
  recallService,
  auditService,
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

  route({
    path: '/person/:nomsId/recall/create/:journeyId/revocation-date',
    controller: new CreateRecallRevocationDateController(),
    validateToSchema: revocationDateSchemaFactory(recallService),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/return-to-custody-date',
    controller: new CreateRecallReturnToCustodyDateController(),
    validateToSchema: returnToCustodyDateSchemaFactory(),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/recall-decision',
    controller: new CreateRecallDecisionController(calculateReleaseDatesService),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/review-sentences',
    controller: new CreateRecallReviewSentencesController(recallService, calculateReleaseDatesService),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/recall-type',
    controller: new CreateRecallTypeController(calculateReleaseDatesService),
    validateToSchema: recallTypeSchema,
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/check-answers',
    controller: new CreateRecallCheckAnswersController(recallService),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:recallId/confirmed',
    controller: new CreateRecallConfirmationController(),
  })

  // create - intercepts
  route({
    path: '/person/:nomsId/recall/create/:journeyId/validation-intercept',
    controller: new CreateRecallCriticalValidationController(),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/conflicting-adjustments',
    controller: new CreateRecallConflictingAdjustmentsController(),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/no-recallable-sentences-found',
    controller: new CreateRecallNoRecallableSentencesController(),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  // create - manual journey
  route({
    path: '/person/:nomsId/recall/create/:journeyId/manual/start',
    controller: new ManualJourneyInterceptController(),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/manual/select-court-cases',
    controller: new SelectCasesController(recallService),
    validateToSchema: selectCourtCasesSchema,
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/manual/select-court-cases/:caseIndex',
    controller: new SelectCasesController(recallService),
    validateToSchema: selectCourtCasesSchema,
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/manual/check-sentences',
    controller: new CheckSentencesController(
      recallService,
      calculateReleaseDatesService,
      courtCasesReleaseDatesService,
    ),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/manual/select-recall-type',
    controller: new CreateManualRecallTypeController(),
    validateToSchema: recallTypeSchema,
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/manual/check-answers',
    controller: new CreateManualRecallCheckAnswersController(recallService),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/confirm-cancel',
    controller: new CreateRecallCancelController(),
    validateToSchema: confirmCancelSchema,
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  // delete recall
  route({
    path: '/person/:nomsId/recall/:recallUuid/delete',
    controller: new ConfirmDeleteRecallController(recallService),
    validateToSchema: confirmDeleteRecallSchema,
  })

  return router
}
