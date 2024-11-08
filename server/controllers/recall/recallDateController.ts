import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'

export default class RecallDateController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    return super.locals(req, res)
  }

  saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    req.sessionModel.set('recallDate', req.form.values.recallDate)
    return next()
  }
}
