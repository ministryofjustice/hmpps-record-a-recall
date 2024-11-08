import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import FormInitialStep from '../base/formInitialStep'
import { sanitizeString } from '../../utils/utils'
import logger from '../../../logger'

export default class PersonSearchController extends FormInitialStep {
  middlewareSetup() {
    super.middlewareSetup()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
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
