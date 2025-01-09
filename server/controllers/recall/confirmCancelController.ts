import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import config from '../../config'

export default class ConfirmCancelController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    req.sessionModel.set('cancelTo', req.journeyModel.attributes.lastVisited)

    return { ...locals, hideCancel: true }
  }

  saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { confirmCancel } = req.form.values
    const cancelTo = req.sessionModel.get<string>('cancelTo')
    if (confirmCancel === 'true') {
      if (req.sessionModel.get('entrypoint') === 'ccards') {
        return res.redirect(`${config.applications.courtCasesReleaseDates.url}/prisoner/${res.locals.nomisId}/overview`)
      }
      return res.redirect(`/person/${res.locals.nomisId}`)
    }
    return res.redirect(cancelTo)
  }
}
