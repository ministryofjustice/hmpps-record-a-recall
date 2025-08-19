import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'
import RecallBaseController from './recallBaseController'
// import { formatLongDate } from '../../formatters/formatDate'

export default class NoCasesSelectedController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)

    // const revocationDate = req.sessionModel.get('revocationDate') as string | undefined

    return {
      ...locals,
      //   revocationDate: revocationDate ? formatLongDate(revocationDate) : 'Not provided',
      //   journeyBaseLink: req.baseUrl,
    }
  }
}
