import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'

export default class FixedTermRecallController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    return super.locals(req, res)
  }

  saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    req.sessionModel.set('fixedTerm', req.form.values.isFixedTermRecall)
    return next()
  }
}
