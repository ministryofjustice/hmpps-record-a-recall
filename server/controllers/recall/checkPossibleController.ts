import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { ValidationMessage } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import PrisonerDetailsController from '../base/prisonerDetailsController'
import logger from '../../../logger'

export default class CheckPossibleController extends PrisonerDetailsController {
  async configure(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const { nomisId, username } = res.locals
    try {
      res.locals.validationResponse = await req.services.calculationService.performCrdsValidation(nomisId, username)
    } catch (error) {
      logger.error(error)
    }
    return super.configure(req, res, next)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const validationErrors = req.sessionModel.get('validationErrors')

    const backLink = `/person/${locals.nomisId}`
    return { ...locals, backLink, validationErrors }
  }

  recallPossible(req: FormWizard.Request, res: Response) {
    const errors: ValidationMessage[] = res.locals.validationResponse
    if (errors && errors.length > 0) {
      req.sessionModel.set(
        'validationErrors',
        errors.map(error => error.message),
      )
      return false
    }
    return errors && errors.length === 0
  }
}
