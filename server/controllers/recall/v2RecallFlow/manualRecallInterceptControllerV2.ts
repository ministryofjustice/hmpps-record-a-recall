import { Request, Response } from 'express'
import BaseController from '../../base/BaseController'
import { clearValidation } from '../../../middleware/validationMiddleware'
import logger from '../../../../logger'

export default class ManualRecallInterceptControllerV2 extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = ManualRecallInterceptControllerV2.getSessionData(req)
    const { nomisId, recallId } = res.locals

    // Get prisoner data from session or res.locals
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Determine if this is an edit recall flow
    const isEditRecall = !!recallId && req.originalUrl.includes('/edit-recall-v2/')

    // Build navigation URLs
    const backLink = isEditRecall
      ? `/person/${nomisId}/edit-recall-v2/${recallId}/rtc-date`
      : `/person/${nomisId}/record-recall-v2/rtc-date`
    const cancelUrl = isEditRecall
      ? `/person/${nomisId}/edit-recall-v2/${recallId}/confirm-cancel`
      : `/person/${nomisId}/record-recall-v2/confirm-cancel`

    // If not coming from a validation redirect, clear form responses
    // This is an intercept page that doesn't have form fields to preserve
    if (!res.locals.formResponses) {
      res.locals.formResponses = {}
    }

    res.render('pages/recall/v2/manual-recall-intercept', {
      prisoner,
      nomisId,
      isEditRecall,
      backLink,
      cancelUrl,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const { nomisId, recallId } = res.locals
    const isEditMode = req.originalUrl.includes('/edit-recall-v2/')

    // Mark that the user has confirmed they understand the manual process
    await ManualRecallInterceptControllerV2.updateSessionData(req, {
      'select-court-case-details.njk': 'confirmed',
    })

    logger.info(`User confirmed manual recall intercept for nomisId: ${nomisId}`)

    // Clear validation and redirect to next step
    clearValidation(req)
    const nextPath = isEditMode
      ? `/person/${nomisId}/edit-recall-v2/${recallId}/select-court-cases`
      : `/person/${nomisId}/record-recall-v2/select-court-cases`
    return res.redirect(nextPath)
  }
}
