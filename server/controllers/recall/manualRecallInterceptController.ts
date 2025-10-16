import { Request, Response } from 'express'
import BaseController from '../base/BaseController'
import { clearValidation } from '../../middleware/validationMiddleware'
import logger from '../../../logger'

export default class ManualRecallInterceptController extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = ManualRecallInterceptController.getSessionData(req)
    const { nomisId, recallId } = res.locals

    const prisoner = res.locals.prisoner || sessionData?.prisoner

    const isEditRecall = !!recallId && req.originalUrl.includes('/edit-recall/')

    const backLink = isEditRecall
      ? `/person/${nomisId}/edit-recall/${recallId}/rtc-date`
      : `/person/${nomisId}/record-recall/rtc-date`
    const cancelUrl = isEditRecall
      ? `/person/${nomisId}/edit-recall/${recallId}/confirm-cancel`
      : `/person/${nomisId}/record-recall/confirm-cancel`

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
    const isEditMode = req.originalUrl.includes('/edit-recall/')

    // Mark that the user has confirmed they understand the manual process
    await ManualRecallInterceptController.updateSessionData(req, {
      'select-court-case-details.njk': 'confirmed',
    })

    logger.info(`User confirmed manual recall intercept for nomisId: ${nomisId}`)

    // Clear validation and redirect to next step
    clearValidation(req)
    const nextPath = isEditMode
      ? `/person/${nomisId}/edit-recall/${recallId}/select-court-cases`
      : `/person/${nomisId}/record-recall/select-court-cases`
    return res.redirect(nextPath)
  }
}
