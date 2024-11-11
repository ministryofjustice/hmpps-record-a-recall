import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { RecallTypes } from '../../@types/recallTypes'

export default class RecallTypeController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  configure(req: FormWizard.Request, res: Response, next: NextFunction) {
    const recallTypes = Object.values(RecallTypes)
    req.form.options.fields.recallType.items = Object.values(recallTypes).map(({ code, description }) => ({
      text: description,
      value: code,
    }))

    next()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    res.locals.fixedTerm = req.sessionModel.get<string>('fixedTerm') === 'true'
    const recallTypes = Object.values(RecallTypes)

    req.form.options.fields.recallType.items = Object.values(recallTypes)
      .filter(type => type.fixedTerm === res.locals.fixedTerm)
      .map(({ code, description }) => ({
        text: description,
        value: code,
      }))
    return super.locals(req, res)
  }
}
