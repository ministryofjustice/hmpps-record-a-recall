import { NextFunction, Response } from 'express'
import { Session } from 'express-session'
import RecallBaseController from './recallBaseController'
import { ExtendedRequest } from '../base/ExpressBaseController'
import { getEntrypoint, sessionModelFields } from '../../helpers/recallSessionHelper'
import { getSessionValue, setSessionValue, unsetSessionValue } from '../../helpers/sessionHelper'
import { entrypointUrl } from '../../utils/utils'

export default class ConfirmCancelController extends RecallBaseController {
  locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const lastVisited = (req.session as Session & { lastVisited?: string })?.lastVisited || ''
    if (!lastVisited.includes('confirm-cancel')) {
      setSessionValue(req, sessionModelFields.RETURN_TO, lastVisited)
    }
    const backLink = getSessionValue<string>(req, sessionModelFields.RETURN_TO) || lastVisited

    return { ...locals, hideCancel: true, backLink }
  }

  saveValues(req: ExtendedRequest, res: Response, next: NextFunction) {
    const confirmCancel = req.form?.values?.confirmCancel || req.body?.confirmCancel
    const returnTo = getSessionValue<string>(req, sessionModelFields.RETURN_TO)
    if (confirmCancel === 'true') {
      const cancelRedirectUrl = this.confirmCancelRedirect(
        getEntrypoint(req as ExtendedRequest & { sessionModel?: unknown }),
        res.locals.nomisId,
      )
      return res.redirect(cancelRedirectUrl)
    }
    unsetSessionValue(req, sessionModelFields.RETURN_TO)
    return res.redirect(returnTo)
  }

  confirmCancelRedirect(entrypoint: string, nomisId: string) {
    return entrypointUrl(entrypoint, nomisId)
  }
}
