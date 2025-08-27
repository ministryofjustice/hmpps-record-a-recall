import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import FormInitialStep from '../base/formInitialStep'
import { sanitizeString } from '../../utils/utils'
import logger from '../../../logger'
import config from '../../config'

export default class PersonSearchController extends FormInitialStep {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.checkForRedirect.bind(this))
  }

  checkForRedirect(req: FormWizard.Request, res: Response, next: NextFunction): void {
    // Check if not in local development and redirect to DPS home
    const isLocalDevelopment = config.domain.includes('localhost') || config.domain.includes('127.0.0.1')

    if (!isLocalDevelopment) {
      // Determine the DPS URL based on the environment
      const { urls } = config.applications.digitalPrisonServices

      // Extract environment from the current domain
      let dpsUrl = urls.dev // default to dev

      if (config.domain.includes('-dev.')) {
        dpsUrl = urls.dev
      } else if (config.domain.includes('-preprod.')) {
        dpsUrl = urls.preprod
      } else if (
        !config.domain.includes('-dev.') &&
        !config.domain.includes('-preprod.') &&
        config.domain.includes('hmpps.service.justice.gov.uk')
      ) {
        dpsUrl = urls.prod
      }

      res.redirect(dpsUrl)
      return
    }

    next()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    res.locals.errorMessage = req.flash('errorMessage')

    return super.locals(req, res)
  }

  async validateFields(req: FormWizard.Request, res: Response, callback: (errors: unknown) => void) {
    super.validateFields(req, res, async errors => {
      const { values } = req.form
      const nomisId = sanitizeString(String(values.nomisId))
      const { prisonerService } = req.services
      const { username } = req.user

      if (errors.nomisId) {
        return callback({ ...errors })
      }
      /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
      const validationErrors: any = {}
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
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { nomisId } = res.locals
    req.sessionModel.set('nomisId', nomisId)
    res.redirect(`/person/${nomisId}`)
  }
}
