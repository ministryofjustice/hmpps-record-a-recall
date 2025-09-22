import { Request, Response, NextFunction } from 'express'
import BaseController from '../base/BaseController'
import { sanitizeString } from '../../utils/utils'
import logger from '../../../logger'
import config from '../../config'
import fields from '../../routes/search/fields'

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

    PersonSearchController.renderForm(req, res, 'pages/search/search', fields, ['nomisId'], {
      nomisId: res.locals.formValues?.nomisId || sessionData?.nomisId || '',
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
