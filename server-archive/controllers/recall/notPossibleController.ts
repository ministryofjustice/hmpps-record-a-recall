import { Request, Response } from 'express'
import BaseController, { RequestWithSession } from '../base/BaseController'
import { entrypointUrl } from '../../utils/utils'
import { SessionManager } from '../../services/sessionManager'

export default class NotPossibleController extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const { nomisId, recallId } = res.locals
    const sessionData = NotPossibleController.getSessionData(req)

    // Get prisoner data from session or res.locals
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Get validation errors from session
    const crdsValidationErrors =
      SessionManager.getSessionValue(req as RequestWithSession, SessionManager.SESSION_KEYS.CRDS_ERRORS) || []

    // Get entrypoint from query params or session
    const entrypoint = (req.query.entrypoint as string) || sessionData?.entrypoint

    // Build back link to appropriate location
    const backLink = entrypointUrl(entrypoint, nomisId)

    // We can't use the journey fields as we check recalls are possible before loading the recall being edited
    const isEditRecall = !!recallId

    // Build reload link to try again
    let reloadLink = ''
    if (isEditRecall) {
      reloadLink = `/person/${nomisId}/edit-recall/${recallId}${entrypoint ? `?entrypoint=${entrypoint}` : ''}`
    } else {
      reloadLink = `/person/${nomisId}/record-recall${entrypoint ? `?entrypoint=${entrypoint}` : ''}`
    }

    res.render('pages/recall/not-possible', {
      prisoner,
      nomisId,
      backLink,
      reloadLink,
      isEditRecall,
      crdsValidationErrors,
    })
  }
}
