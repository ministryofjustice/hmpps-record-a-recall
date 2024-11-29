import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'

export default class RecallDateController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner: PrisonerSearchApiPrisoner = locals.prisoner as PrisonerSearchApiPrisoner

    const backLink = `/person/${prisoner.prisonerNumber}`
    return { ...locals, backLink }
  }

  saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    req.sessionModel.set('recallDate', req.form.values.recallDate)
    return next()
  }
}
