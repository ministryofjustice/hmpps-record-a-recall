import type { RequestHandler } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { Services } from '../services'
import { Page } from '../services/auditService'
import { Controller } from './controller'
import { SchemaFactory, validate } from '../middleware/validationMiddleware'
import CreateRecallRevocationDateController from './create/revocation-date/createRecallRevocationDateController'
import ApiRoutes from './prisonerImageRoute'
import StartCreateRecallJourneyController from './create/start/startCreateRecallJourneyController'
import { revocationDateSchemaFactory } from './common/revocation-date/revocationDateSchemas'
import { ensureInCreateRecallJourney } from '../middleware/journeyMiddleware'
import asyncMiddleware from '../middleware/asyncMiddleware'
import ManualJourneyInterceptController from './manual/start/manualJourneyInterceptController'

export default function routes({ auditService, prisonerService, calculateReleaseDatesService }: Services): Router {
  const apiRoutes = new ApiRoutes(prisonerService)

  const router = Router()

  router.get('/', async (req, res) => {
    await auditService.logPageView(Page.EXAMPLE_PAGE, { who: res.locals.user.username, correlationId: req.id })
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
    path: '/person/:nomsId/recall/create/:journeyId/manual/start',
    controller: new ManualJourneyInterceptController(),
    additionalMiddleware: [ensureInCreateRecallJourney],
  })

  return router
}
