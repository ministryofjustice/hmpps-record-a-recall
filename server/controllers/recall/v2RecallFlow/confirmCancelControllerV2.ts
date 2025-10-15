import { Request, Response } from 'express'
import BaseController from '../../base/BaseController'
import { clearValidation } from '../../../middleware/validationMiddleware'
import logger from '../../../../logger'
import { entrypointUrl } from '../../../utils/utils'

export default class ConfirmCancelControllerV2 extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = ConfirmCancelControllerV2.getSessionData(req)
    const { nomisId, recallId } = res.locals

    // Get prisoner data from session or res.locals
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Determine if this is an edit recall flow
    const isEditRecall = !!recallId

    // Get the referring page from the request header
    const referrer = req.get('Referrer') || ''

    // Parse the referrer to get the path only (remove protocol and host)
    let referrerPath = ''
    if (referrer) {
      try {
        const url = new URL(referrer)
        referrerPath = url.pathname + url.search
      } catch {
        referrerPath = referrer
      }
    }

    // Store the return URL if this is the first visit to confirm-cancel
    const currentReturnTo = sessionData?.returnTo
    if (!currentReturnTo && referrerPath && !referrerPath.includes('confirm-cancel')) {
      await ConfirmCancelControllerV2.updateSessionData(req, { returnTo: referrerPath })
    }

    // Get the return URL for the back link
    const returnTo = sessionData?.returnTo || referrerPath || `/person/${nomisId}`
    const backLink = returnTo

    // If not coming from a validation redirect, clear form responses
    if (!res.locals.formResponses) {
      res.locals.formResponses = {}
    }

    res.render('pages/recall/v2/confirm-cancel', {
      prisoner,
      nomisId,
      isEditRecall,
      backLink,
      hideCancel: true, // Hide cancel button on the cancel confirmation page
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const { confirmCancel } = req.body
    const { nomisId } = res.locals
    const sessionData = ConfirmCancelControllerV2.getSessionData(req)

    // Get prisoner data from session
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Check if user confirmed cancellation
    if (confirmCancel === 'true') {
      // Clear the return URL
      await ConfirmCancelControllerV2.updateSessionData(req, { returnTo: null })

      // Determine where to redirect based on entry point
      const entrypoint = sessionData?.entrypoint || 'search'
      const cancelRedirectUrl = ConfirmCancelControllerV2.getCancelRedirectUrl(entrypoint, nomisId, prisoner)

      logger.info(`User confirmed cancellation, redirecting to ${cancelRedirectUrl}`)

      // Clear validation and redirect
      clearValidation(req)
      return res.redirect(cancelRedirectUrl)
    }

    // User selected 'No' - return to previous page
    const returnTo = sessionData?.returnTo || `/person/${nomisId}/record-recall-v2/revocation-date`

    // Clear the stored return URL
    await ConfirmCancelControllerV2.updateSessionData(req, { returnTo: null })

    logger.info(`User declined cancellation, returning to ${returnTo}`)

    // Clear validation and redirect back
    clearValidation(req)
    return res.redirect(returnTo)
  }

  private static getCancelRedirectUrl(entrypoint: string, nomisId: string, _prisoner?: unknown): string {
    // Use the entrypointUrl utility to get the correct redirect URL
    return entrypointUrl(entrypoint as string, nomisId)
  }
}
