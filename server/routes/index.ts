import { Router } from 'express'
import { z } from 'zod'
import type { Request, Response, NextFunction, RequestHandler } from 'express'

import type { Services } from '../services'
import { Page } from '../services/auditService'
import { Controller } from './controller'
import { SchemaFactory, validate } from '../middleware/validationMiddleware'
import RevocationDateController from './revocation-date/revocationDateController'
import ApiRoutes from './prisonerImageRoute'

export default function routes({ auditService, prisonerService }: Services): Router {
  const apiRoutes = new ApiRoutes(prisonerService)

  const router = Router()

  router.get('/', async (req, res, next) => {
    await auditService.logPageView(Page.EXAMPLE_PAGE, { who: res.locals.user.username, correlationId: req.id })
    return res.render('pages/index')
  })
  router.get('/api/person/:nomsId/image', apiRoutes.personImage)

  const route = <P extends { [key: string]: string }>({
    path,
    controller,
    validateToSchema,
  }: {
    path: string
    controller: Controller
    validateToSchema?: z.ZodTypeAny | SchemaFactory<P>
  }) => {
    router.get(path, asyncMiddleware(controller.GET))
    if (controller.POST) {
      if (validateToSchema) {
        router.post(path, validate(validateToSchema), asyncMiddleware(controller.POST))
      } else {
        router.post(path, asyncMiddleware(controller.POST))
      }
    }
  }

  // TODO add start controller to initiate session.

  route({
    path: '/person/:nomsId/record-recall/revocation-date',
    controller: new RevocationDateController(),
  })

  return router
}

function asyncMiddleware<P extends { [key: string]: string }, ResBody, ReqBody, Qs extends ParsedQs>(
  fn: RequestHandler<P, ResBody, ReqBody, Qs>,
) {
  return (req: Request<P, ResBody, ReqBody, Qs>, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
interface ParsedQs {
  [key: string]: undefined | string | string[] | ParsedQs | ParsedQs[]
}
