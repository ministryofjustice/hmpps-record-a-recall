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
import { returnToCustodyDateSchema } from './common/return-to-custody-date/returnToCustodyDateSchemas'
import HomeController from './home/homeController'
import ManualJourneyInterceptController from './create/manual/start/manualJourneyInterceptController'
import SelectCasesController from './create/manual/select-cases/selectCasesController'

export default function routes({
  prisonerService,
  calculateReleaseDatesService,
  courtCasesReleaseDatesService,
  recallService,
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
    router.get(path, ...additionalMiddleware, asyncMiddleware(controller.GET))
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
    validateToSchema: revocationDateSchemaFactory(),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/return-to-custody-date',
    controller: new CreateRecallReturnToCustodyDateController(),
    validateToSchema: returnToCustodyDateSchema,
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/recall-decision',
    controller: new CreateRecallDecisionController(calculateReleaseDatesService),
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
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  route({
    path: '/person/:nomsId/recall/create/:journeyId/manual/select-court-cases/:caseIndex',
    controller: new SelectCasesController(recallService),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  return router
}
