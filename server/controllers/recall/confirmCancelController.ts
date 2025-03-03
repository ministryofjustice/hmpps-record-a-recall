import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import config from '../../config'
import { sessionModelFields } from '../../helpers/formWizardHelper'

export default class ConfirmCancelController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    if (!req.journeyModel.attributes.lastVisited.includes('confirm-cancel')) {
      req.sessionModel.set(sessionModelFields.RETURN_TO, req.journeyModel.attributes.lastVisited)
    }

    return { ...locals, hideCancel: true }
  }

  saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { confirmCancel } = req.form.values
    const returnTo = req.sessionModel.get<string>(sessionModelFields.RETURN_TO)
    if (confirmCancel === 'true') {
      if (req.sessionModel.get(sessionModelFields.ENTRYPOINT) === 'ccards') {
        return res.redirect(`${config.applications.courtCasesReleaseDates.url}/prisoner/${res.locals.nomisId}/overview`)
      }
      return res.redirect(`/person/${res.locals.nomisId}`)
    }
    req.sessionModel.unset(sessionModelFields.RETURN_TO)
    return res.redirect(returnTo)
  }
}
