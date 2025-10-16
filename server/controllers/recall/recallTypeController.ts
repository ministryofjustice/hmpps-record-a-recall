import { Request, Response } from 'express'
import BaseController from '../base/BaseController'
import { clearValidation } from '../../middleware/validationMiddleware'
import logger from '../../../logger'
import { RecallTypes } from '../../@types/recallTypes'
import { SessionManager } from '../../services/sessionManager'
import config from '../../config'

export default class RecallTypeController extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = RecallTypeController.getSessionData(req)
    const { nomisId, recallId } = res.locals

    // Get prisoner data from session or res.locals
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Detect if this is edit mode from URL path
    const isEditMode = req.originalUrl.includes('/edit-recall/')
    const isEditFromCheckYourAnswers = req.originalUrl.endsWith('/edit')

    // Build navigation URLs based on mode
    let backLink: string
    if (isEditMode) {
      backLink = `/person/${nomisId}/edit-recall/${recallId}/edit-summary`
    } else if (isEditFromCheckYourAnswers) {
      backLink = `/person/${nomisId}/record-recall/check-your-answers`
    } else {
      backLink = `/person/${nomisId}/record-recall/check-sentences`
    }
    const cancelUrl = isEditMode
      ? `/person/${nomisId}/edit-recall/${recallId}/confirm-cancel`
      : `/person/${nomisId}/record-recall/confirm-cancel`

    // Store the current URL for cancel confirmation return
    const currentPath = isEditMode
      ? `/person/${nomisId}/edit-recall/${recallId}/recall-type`
      : `/person/${nomisId}/record-recall/recall-type`
    await RecallTypeController.updateSessionData(req, { returnTo: currentPath })

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
      isEditRecall: isEditMode,
      backLink,
      cancelUrl,
      recallTypeOptions,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const sessionData = RecallTypeController.getSessionData(req)
    const { nomisId, recallId } = res.locals
    const { recallType } = req.body
    const isEditMode = req.originalUrl.includes('/edit-recall/')
    const isEditFromCheckYourAnswers = req.originalUrl.endsWith('/edit')

    logger.info(`Processing recall type selection: ${recallType} for prisoner ${nomisId}`)

    // Store the recall type in session
    await RecallTypeController.updateSessionData(req, {
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

    // Clear validation and redirect
    clearValidation(req)

    // If in edit mode, return to edit-summary
    if (isEditMode) {
      // Mark that this step was edited
      await RecallTypeController.updateSessionData(req, {
        lastEditedStep: 'recall-type',
      })
      return res.redirect(`/person/${nomisId}/edit-recall/${recallId}/edit-summary`)
    }

    // If editing from check-your-answers, return there
    if (isEditFromCheckYourAnswers) {
      return res.redirect(`/person/${nomisId}/record-recall/check-your-answers`)
    }

    // Normal flow - determine next route based on mismatch
    if (recallTypeMismatch) {
      logger.info(`Recall type mismatch detected for ${nomisId}, redirecting to interrupt page`)
      return res.redirect(`/person/${nomisId}/record-recall/recall-type-interrupt`)
    }

    return res.redirect(`/person/${nomisId}/record-recall/check-your-answers`)
  }
}
