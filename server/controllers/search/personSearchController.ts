import { NextFunction, Response } from 'express'
import { ExtendedRequest } from '../base/ExpressBaseController'

import FormInitialStep from '../base/formInitialStep'
import { sanitizeString } from '../../utils/utils'
import { setSessionValue } from '../../helpers/sessionHelper'
import logger from '../../../logger'
import config from '../../config'

export default class PersonSearchController extends FormInitialStep {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.checkForRedirect.bind(this))
  }

  checkForRedirect(req: ExtendedRequest, res: Response, next: NextFunction): void {
    // Check if not in local development and redirect to DPS home
    const isLocalDevelopment = config.domain.includes('localhost') || config.domain.includes('127.0.0.1')

    if (!isLocalDevelopment) {
      res.redirect(config.applications.digitalPrisonServices.url)
      return
    }

    next()
  }

  locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    res.locals.errorMessage = req.flash('errorMessage')

    return super.locals(req, res)
  }

  validateFields(
    req: ExtendedRequest,
    res: Response,
    callback?: (errors: Record<string, unknown>) => void,
  ): Record<string, unknown> | void {
    if (!callback) {
      return {}
    }
    super.validateFields(req as ExtendedRequest, res as Response, async errors => {
      const { values } = req.form
      const nomisId = sanitizeString(String(values.nomisId))
      const { prisonerService } = req.services
      const { username } = req.user

      if (errors.nomisId) {
        return callback({ ...errors })
      }
      const validationErrors: Record<string, unknown> = {}
      let prisoner
      try {
        prisoner = await prisonerService.getPrisonerDetails(nomisId, username)
      } catch (error) {
        logger.error(error)
        validationErrors.nomisId = this.formError('nomisId', 'prisonerDetailsNotFound')
        return callback({ ...errors, ...validationErrors })
      }
      res.locals.prisoner = prisoner
      res.locals.nomisId = nomisId
      return callback({ ...errors, ...validationErrors })
    })
    return undefined
  }

  successHandler(req: ExtendedRequest, res: Response, next: NextFunction) {
    const { nomisId } = res.locals
    setSessionValue(req, 'nomisId', nomisId)
    res.redirect(`/person/${nomisId}`)
  }
}
