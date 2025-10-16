import { Request, Response } from 'express'
import type { CourtCase } from 'models'
import BaseController from '../base/BaseController'
import { clearValidation } from '../../middleware/validationMiddleware'
import logger from '../../../logger'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'
import { RecallableCourtCaseSentence } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { SessionManager } from '../../services/sessionManager'

export default class MultipleSentenceDecisionController extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = MultipleSentenceDecisionController.getSessionData(req)
    const { nomisId } = res.locals
    const { courtCaseId } = req.params
    const recallId = res.locals.recallId || null

    try {
      // Get prisoner data
      const prisoner = res.locals.prisoner || sessionData?.prisoner

      // Determine if edit recall
      const isEditRecall = !!recallId

      // Get court cases from session (look for selectedCases first, then fall back to courtCaseOptions)
      const courtCases = (sessionData?.selectedCases || sessionData?.courtCaseOptions || []) as CourtCase[]

      // Find the target court case
      const targetCase = courtCases.find(c => c.caseId === courtCaseId)

      if (!targetCase) {
        logger.error(`Court case not found: ${courtCaseId}`)
        return res.redirect(`/person/${nomisId}/record-recall/update-sentence-types-summary`)
      }

      // Filter for sentences with unknown pre-recall sentence type
      const unknownSentences =
        targetCase.sentences
          ?.filter((s: RecallableCourtCaseSentence) => s.sentenceTypeUuid === SENTENCE_TYPE_UUIDS.UNKNOWN_PRE_RECALL)
          .map((s: RecallableCourtCaseSentence) => ({
            sentenceUuid: s.sentenceUuid,
            isUnknownSentenceType: true,
          })) || []

      if (unknownSentences.length === 0) {
        logger.warn('No unknown sentences found for court case', { courtCaseId })
        return res.redirect(`/person/${nomisId}/record-recall/update-sentence-types-summary`)
      }

      // Store sentences in session for later use
      await MultipleSentenceDecisionController.updateSessionData(req, {
        [SessionManager.SESSION_KEYS.SENTENCES_IN_CURRENT_CASE]: unknownSentences,
        [SessionManager.SESSION_KEYS.SELECTED_COURT_CASE_UUID]: courtCaseId,
      })

      // Set navigation
      const backLink = `/person/${nomisId}/record-recall/update-sentence-types-summary`
      const cancelUrl = `/person/${nomisId}/record-recall/confirm-cancel`

      // Store return URL for cancel flow
      await MultipleSentenceDecisionController.updateSessionData(req, {
        returnTo: req.originalUrl,
      })

      // Load form data from session if not from validation
      if (!res.locals.formResponses) {
        res.locals.formResponses = {
          sameSentenceType: sessionData?.sameSentenceType,
        }
      }

      return res.render('pages/recall/v2/multiple-sentence-decision', {
        prisoner,
        nomisId,
        isEditRecall,
        backLink,
        cancelUrl,
        courtCase: targetCase,
        courtCaseId,
        sentenceCount: unknownSentences.length,
        validationErrors: res.locals.validationErrors,
        formResponses: res.locals.formResponses,
        pageHeading: 'Record a recall',
      })
    } catch (error) {
      logger.error('Error in MultipleSentenceDecisionController.get', { error: error.message })
      return res.redirect(`/person/${nomisId}/record-recall/update-sentence-types-summary`)
    }
  }

  static async post(req: Request, res: Response): Promise<void> {
    const sessionData = MultipleSentenceDecisionController.getSessionData(req)
    const { nomisId } = res.locals
    const { courtCaseId } = req.params
    const { sameSentenceType } = req.body

    try {
      // Store decision in session
      const isSameType = sameSentenceType === 'yes'

      await MultipleSentenceDecisionController.updateSessionData(req, {
        sameSentenceType,
        [SessionManager.SESSION_KEYS.BULK_UPDATE_MODE]: isSameType,
      })

      // Clear validation
      clearValidation(req)

      if (isSameType) {
        // For bulk flow, navigate to bulk sentence type page
        return res.redirect(`/person/${nomisId}/record-recall/bulk-sentence-type/${courtCaseId}`)
      }

      // For individual flow, initialize the sentence index
      await MultipleSentenceDecisionController.updateSessionData(req, {
        [SessionManager.SESSION_KEYS.CURRENT_SENTENCE_INDEX]: 0,
      })

      // Get the first sentence to determine next URL
      const sentencesInCase = sessionData?.[SessionManager.SESSION_KEYS.SENTENCES_IN_CURRENT_CASE] as Array<{
        sentenceUuid: string
        isUnknownSentenceType: boolean
      }>

      if (sentencesInCase && sentencesInCase.length > 0) {
        // Navigate to the first sentence
        return res.redirect(`/person/${nomisId}/record-recall/select-sentence-type/${sentencesInCase[0].sentenceUuid}`)
      }

      // Fallback if no sentences found
      logger.error('No sentences in current case found in session during POST')
      return res.redirect(`/person/${nomisId}/record-recall/update-sentence-types-summary`)
    } catch (error) {
      logger.error('Error in MultipleSentenceDecisionController.post', { error: error.message })
      clearValidation(req)
      return res.redirect(`/person/${nomisId}/record-recall/update-sentence-types-summary`)
    }
  }
}
