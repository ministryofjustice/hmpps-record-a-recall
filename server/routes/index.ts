import { type RequestHandler, Router } from 'express'

import asyncMiddleware from '../middleware/asyncMiddleware'
import type { Services } from '../services'
import { Page } from '../services/auditService'
import RecallEntryRoutes from './recallEntryRoutes'
import ApiRoutes from './apiRoutes'

// Middleware to log page views
const logPageViewMiddleware = (auditService: Services['auditService'], page: Page): RequestHandler => {
  return async (req, res, next) => {
    try {
      await auditService.logPageView(page, { who: res.locals.user.username, correlationId: req.id })
    } catch (error) {
      return next(error) // Return the call to next with error
    }
    return next() // Explicitly return the call to next
  }
}

export default function routes({ auditService, prisonerService }: Services): Router {
  const router = Router()
  const get = (path: string | string[], ...handlers: RequestHandler[]) =>
    router.get(path, ...handlers.map(handler => asyncMiddleware(handler)))

  const apiRoutes = new ApiRoutes(prisonerService)
  const recallEntryRoutes = new RecallEntryRoutes()

  // Apply middleware to log page views before handling the route
  get('/', logPageViewMiddleware(auditService, Page.EXAMPLE_PAGE), async (req, res, next) => {
    res.render('pages/index')
  })

  get('/api/person/:nomsId/image', apiRoutes.personImage)

  get(
    '/person/:nomsId/recall-entry/enter-recall-date',
    logPageViewMiddleware(auditService, Page.ENTER_RECALL_DATE),
    async (req, res, next) => {
      recallEntryRoutes.getEnterRecallDate(req, res, next)
    },
  )

  return router
}
