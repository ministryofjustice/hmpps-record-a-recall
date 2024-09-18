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

export default function routes({ auditService, prisonerService, recallService, validationService }: Services): Router {
  const router = Router()
  const get = (path: string | string[], ...handlers: RequestHandler[]) =>
    router.get(path, ...handlers.map(handler => asyncMiddleware(handler)))
  const post = (path: string | string[], handler: RequestHandler) => router.post(path, asyncMiddleware(handler))

  const apiRoutes = new ApiRoutes(prisonerService)
  const recallEntryRoutes = new RecallEntryRoutes(prisonerService, recallService, validationService)

  // Apply middleware to log page views before handling the route
  get('/', logPageViewMiddleware(auditService, Page.EXAMPLE_PAGE), async (req, res, next) => {
    res.render('pages/index')
  })

  get('/person/:nomsId', logPageViewMiddleware(auditService, Page.PERSON_HOME_PAGE), async (req, res, next) => {
    recallEntryRoutes.getPersonHomePage(req, res, next)
  })

  get('/api/person/:nomsId/image', apiRoutes.personImage)

  get(
    '/person/:nomsId/recall-entry/enter-recall-date',
    logPageViewMiddleware(auditService, Page.ENTER_RECALL_DATE),
    async (req, res, next) => {
      recallEntryRoutes.getEnterRecallDate(req, res, next)
    },
  )

  post('/person/:nomsId/recall-entry/enter-recall-date', async (req, res, next) => {
    recallEntryRoutes.submitEnterRecallDate(req, res, next)
  })

  get(
    '/person/:nomsId/recall-entry/enter-return-to-custody-date',
    logPageViewMiddleware(auditService, Page.ENTER_RETURN_TO_CUSTODY_DATE),
    async (req, res, next) => {
      recallEntryRoutes.getEnterReturnToCustodyDate(req, res, next)
    },
  )

  post('/person/:nomsId/recall-entry/enter-return-to-custody-date', async (req, res, next) => {
    recallEntryRoutes.submitReturnToCustodyDate(req, res, next)
  })

  get(
    '/person/:nomsId/recall-entry/check-sentences',
    logPageViewMiddleware(auditService, Page.CHECK_SENTENCES),
    async (req, res, next) => {
      recallEntryRoutes.getCheckSentences(req, res, next)
    },
  )

  get(
    '/person/:nomsId/recall-entry/view-all-sentences',
    logPageViewMiddleware(auditService, Page.VIEW_ALL_SENTENCES),
    async (req, res, next) => {
      recallEntryRoutes.getViewAllSentences(req, res, next)
    },
  )

  get(
    '/person/:nomsId/recall-entry/enter-recall-type',
    logPageViewMiddleware(auditService, Page.ENTER_RECALL_TYPE),
    async (req, res, next) => {
      recallEntryRoutes.getEnterRecallType(req, res, next)
    },
  )

  post('/person/:nomsId/recall-entry/enter-recall-type', async (req, res, next) => {
    recallEntryRoutes.submitRecallType(req, res, next)
  })

  get(
    '/person/:nomsId/recall-entry/check-your-answers',
    logPageViewMiddleware(auditService, Page.CHECK_YOUR_ANSWERS),
    async (req, res, next) => {
      recallEntryRoutes.getCheckYourAnswers(req, res, next)
    },
  )

  post('/person/:nomsId/recall-entry/check-your-answers', async (req, res, next) => {
    recallEntryRoutes.submitCheckYourAnswers(req, res, next)
  })

  get(
    '/person/:nomsId/recall-entry/success-confirmation',
    logPageViewMiddleware(auditService, Page.RECALL_ENTRY_SUCCESS),
    async (req, res, next) => {
      recallEntryRoutes.getSuccessConfirmation(req, res, next)
    },
  )

  get(
    '/person/:nomsId/recall-entry/ftr-question',
    logPageViewMiddleware(auditService, Page.FTR_QUESTION),
    async (req, res, next) => {
      recallEntryRoutes.getFixedTermRecallQuestion(req, res, next)
    },
  )

  return router
}
