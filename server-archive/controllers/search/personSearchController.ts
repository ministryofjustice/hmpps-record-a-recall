import { Request, Response, NextFunction } from 'express'
import BaseController from '../base/BaseController'
import { sanitizeString } from '../../utils/utils'
import { clearValidation } from '../../middleware/validationMiddleware'
import logger from '../../../logger'
import config from '../../config'

export default class PersonSearchController extends BaseController {
  static checkForRedirect(_req: Request, res: Response, next: NextFunction): void {
    // Check if not in local development and redirect to DPS home
    const isLocalDevelopment = config.domain.includes('localhost') || config.domain.includes('127.0.0.1')

    if (!isLocalDevelopment) {
      res.redirect(config.applications.digitalPrisonServices.url)
      return
    }

    next()
  }

  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = PersonSearchController.getSessionData(req)

    // If not coming from a validation redirect, load from session
    if (!res.locals.formResponses) {
      res.locals.formResponses = sessionData
    }

    res.render('pages/search/search', {
      nomisId: res.locals.formResponses?.nomisId || sessionData?.nomisId || '',
      // Pass validation data explicitly for template access
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const nomisId = sanitizeString(String(req.body.nomisId))
    const { prisonerService } = req.services
    const { username } = req.user

    try {
      const prisoner = await prisonerService.getPrisonerDetails(nomisId, username)

      PersonSearchController.updateSessionData(req, { nomisId })

      res.locals.prisoner = prisoner
      res.locals.nomisId = nomisId

      // Clear validation state before redirecting to the next page
      clearValidation(req)

      res.redirect(`/person/${nomisId}`)
    } catch (error) {
      logger.error('Error fetching prisoner details', error)

      PersonSearchController.setValidationError(
        req,
        res,
        'nomisId',
        'No prisoner details found for this NOMIS ID',
        '/search/nomisId',
      )
    }
  }
}
