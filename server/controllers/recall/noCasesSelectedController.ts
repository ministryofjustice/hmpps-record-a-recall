import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'
import RecallBaseController from './recallBaseController'

export default class NoCasesSelectedController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)

    return {
      ...locals,
    }
  }
}
