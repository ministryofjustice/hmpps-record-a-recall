import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import config from '../../config'
import { getEntrypoint, sessionModelFields } from '../../helpers/formWizardHelper'

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
      const cancelRedirectUrl = this.confirmCancelRedirect(getEntrypoint(req), res.locals.nomisId)
      return res.redirect(cancelRedirectUrl)
    }
    req.sessionModel.unset(sessionModelFields.RETURN_TO)
    return res.redirect(returnTo)
  }

  confirmCancelRedirect(entrypoint: string, nomisId: string) {
    if (entrypoint === 'ccards') {
      return `${config.applications.courtCasesReleaseDates.url}/prisoner/${nomisId}/overview`
    }
    if (entrypoint?.startsWith('adj_')) {
      const adjustmentTypeUrl = entrypoint.substring(entrypoint.indexOf('_') + 1)
      return `${config.applications.adjustments.url}/${nomisId}/${adjustmentTypeUrl}/view`
    }
    return `/person/${nomisId}`
  }
}
