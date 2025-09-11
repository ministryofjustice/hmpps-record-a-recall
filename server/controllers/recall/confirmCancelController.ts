import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { SessionManager } from '../../services/sessionManager'
import { getEntrypoint } from '../../helpers/formWizardHelper'
import { entrypointUrl } from '../../utils/utils'

export default class ConfirmCancelController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    if (!req.journeyModel.attributes.lastVisited.includes('confirm-cancel')) {
      SessionManager.setSessionValue(
        req,
        SessionManager.SESSION_KEYS.RETURN_TO,
        req.journeyModel.attributes.lastVisited,
      )
    }
    const backLink =
      SessionManager.getSessionValue<string>(req, SessionManager.SESSION_KEYS.RETURN_TO) ||
      req.journeyModel.attributes.lastVisited

    return { ...locals, hideCancel: true, backLink }
  }

  saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { confirmCancel } = req.form.values
    const returnTo = SessionManager.getSessionValue<string>(req, SessionManager.SESSION_KEYS.RETURN_TO)
    if (confirmCancel === 'true') {
      const cancelRedirectUrl = this.confirmCancelRedirect(getEntrypoint(req), res.locals.nomisId)
      return res.redirect(cancelRedirectUrl)
    }
    SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.RETURN_TO, null)
    return res.redirect(returnTo)
  }

  confirmCancelRedirect(entrypoint: string, nomisId: string) {
    return entrypointUrl(entrypoint, nomisId)
  }
}
