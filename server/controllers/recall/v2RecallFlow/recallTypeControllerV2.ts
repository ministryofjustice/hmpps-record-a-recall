import { Request, Response } from 'express'
import BaseController from '../../base/BaseController'
import { clearValidation } from '../../../middleware/validationMiddleware'
import logger from '../../../../logger'
import { RecallTypes } from '../../../@types/recallTypes'
import { SessionManager } from '../../../services/sessionManager'
import config from '../../../config'

export default class RecallTypeControllerV2 extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = RecallTypeControllerV2.getSessionData(req)
    const { nomisId, recallId } = res.locals

    // Get prisoner data from session or res.locals
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Determine if this is an edit recall flow
    const isEditRecall = !!recallId

    // Build navigation URLs based on whether it's edit or new recall
    const backLink = isEditRecall
      ? `/person/${nomisId}/recall/${recallId}/edit/edit-summary`
      : `/person/${nomisId}/record-recall-v2/check-sentences`
    const cancelUrl = `/person/${nomisId}/record-recall-v2/confirm-cancel`

    // Store the current URL for cancel confirmation return
    const currentPath = `/person/${nomisId}/record-recall-v2/recall-type`
    RecallTypeControllerV2.updateSessionData(req, { returnTo: currentPath })

    // Load form data from session if not coming from validation
    if (!res.locals.formResponses) {
      res.locals.formResponses = {
        recallType: sessionData?.recallType,
      }
    }

    // Build recall type options
    const recallTypeOptions = Object.values(RecallTypes).map(({ code, description }) => ({
      value: code,
      text: description,
      checked: res.locals.formResponses?.recallType === code,
    }))

    res.render('pages/recall/v2/recall-type', {
      prisoner,
      nomisId,
      isEditRecall,
      backLink,
      cancelUrl,
      recallTypeOptions,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const sessionData = RecallTypeControllerV2.getSessionData(req)
    const { nomisId } = res.locals
    const { recallType } = req.body

    logger.info(`Processing recall type selection: ${recallType} for prisoner ${nomisId}`)

    // Store the recall type in session
    RecallTypeControllerV2.updateSessionData(req, {
      recallType,
    })

    // Check for recall type mismatch if feature toggle is enabled
    let recallTypeMismatch = false
    if (config.featureToggles.unexpectedRecallTypeCheckEnabled) {
      const invalidRecallTypes = sessionData?.invalidRecallTypes || []
      // Check if selected type is in the invalid list
      recallTypeMismatch = invalidRecallTypes?.map((t: { code: string }) => t.code).includes(recallType) || false
    }

    // Store the mismatch flag in session using SessionManager directly for compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SessionManager.setSessionValue(req as any, SessionManager.SESSION_KEYS.RECALL_TYPE_MISMATCH, recallTypeMismatch)

    // Clear validation and redirect to next step
    clearValidation(req)

    // Determine next route based on mismatch
    if (recallTypeMismatch) {
      logger.info(`Recall type mismatch detected for ${nomisId}, redirecting to interrupt page`)
      return res.redirect(`/person/${nomisId}/record-recall-v2/recall-type-interrupt`)
    }

    return res.redirect(`/person/${nomisId}/record-recall-v2/check-your-answers`)
  }
}
