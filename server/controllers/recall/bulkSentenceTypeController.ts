import { Request, Response } from 'express'
import type { CourtCase } from 'models'
import BaseController from '../base/BaseController'
import { clearValidation } from '../../middleware/validationMiddleware'
import logger from '../../../logger'
import { SentenceType } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { findSentenceAndCourtCase } from '../../utils/sentenceHelper'
import { formatDateStringToDDMMYYYY } from '../../utils/utils'
import SelectSentenceTypeController from './selectSentenceTypeController'

export default class BulkSentenceTypeController extends BaseController {
  private static async getCommonApplicableSentenceTypes(
    req: Request,
    res: Response,
    sentencesInCase: Array<{ sentenceUuid: string; isUnknownSentenceType: boolean }>,
    courtCases: CourtCase[],
    targetCase: CourtCase,
  ): Promise<SentenceType[]> {
    // Get applicable types for each sentence
    const allApplicableTypesPromises = sentencesInCase.map(async ({ sentenceUuid }) => {
      const { targetSentence } = findSentenceAndCourtCase(sentenceUuid, courtCases)
      if (!targetSentence) {
        throw new Error(`Sentence not found: ${sentenceUuid}`)
      }
      // Use the same helper used by SelectSentenceTypeController
      return SelectSentenceTypeController.getApplicableSentenceTypes(req, res, targetSentence, targetCase)
    })

    const allApplicableTypes = await Promise.all(allApplicableTypesPromises)

    // Find intersection of all types (types common to all sentences)
    if (allApplicableTypes.length === 0) return []

    const commonTypes = allApplicableTypes.reduce((intersection, currentTypes) => {
      return intersection.filter(intersectionType =>
        currentTypes.some(currentType => currentType.sentenceTypeUuid === intersectionType.sentenceTypeUuid),
      )
    })

    return commonTypes
  }

  static async get(req: Request, res: Response): Promise<void> {
    try {
      const sessionData = BulkSentenceTypeController.getSessionData(req)
      const { nomisId } = res.locals
      const { courtCaseId } = req.params
      const recallId = res.locals.recallId || null

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

      // Get sentences from session
      const sentencesInCase = sessionData?.sentencesInCurrentCase as Array<{
        sentenceUuid: string
        isUnknownSentenceType: boolean
      }>

      if (!sentencesInCase || sentencesInCase.length === 0) {
        logger.error('No sentences found in session')
        return res.redirect(`/person/${nomisId}/record-recall/update-sentence-types-summary`)
      }

      // Get common applicable sentence types
      const sentenceTypes = await BulkSentenceTypeController.getCommonApplicableSentenceTypes(
        req,
        res,
        sentencesInCase,
        courtCases,
        targetCase,
      )

      // Check if already updated
      const updatedSentences = (sessionData?.updatedSentenceTypes || {}) as Record<
        string,
        { uuid: string; description: string }
      >
      const firstSentence = sentencesInCase[0]
      const selectedType = updatedSentences[firstSentence.sentenceUuid]?.uuid

      // Set navigation
      const backLink = `/person/${nomisId}/record-recall/multiple-sentence-decision/${courtCaseId}`
      const cancelUrl = `/person/${nomisId}/record-recall/confirm-cancel`

      // Store return URL for cancel flow
      await BulkSentenceTypeController.updateSessionData(req, {
        returnTo: req.originalUrl,
      })

      // Load form data from session if not from validation
      if (!res.locals.formResponses) {
        res.locals.formResponses = {
          sentenceType: selectedType,
        }
      }

      // Format court case details for display
      const formattedCourtCase = {
        ...targetCase,
        date: targetCase.date ? formatDateStringToDDMMYYYY(targetCase.date) : null,
        courtName: targetCase.locationName || 'Court name not available',
      }

      return res.render('pages/recall/v2/bulk-sentence-type', {
        prisoner,
        nomisId,
        isEditRecall,
        backLink,
        cancelUrl,
        courtCase: formattedCourtCase,
        sentenceCount: sentencesInCase.length,
        sentenceTypes,
        selectedType,
        validationErrors: res.locals.validationErrors,
        formResponses: res.locals.formResponses,
        pageHeading: 'Record a recall',
      })
    } catch (error) {
      logger.error('Error in BulkSentenceTypeController.get', { error: error.message })
      const { nomisId } = res.locals
      return res.redirect(`/person/${nomisId}/record-recall/update-sentence-types-summary`)
    }
  }

  static async post(req: Request, res: Response): Promise<void> {
    try {
      const sessionData = BulkSentenceTypeController.getSessionData(req)
      const { nomisId } = res.locals
      const { courtCaseId } = req.params
      const { sentenceType } = req.body

      // Get sentences from session
      const sentencesInCase = sessionData?.sentencesInCurrentCase as Array<{
        sentenceUuid: string
        isUnknownSentenceType: boolean
      }>

      if (!sentencesInCase || sentencesInCase.length === 0) {
        logger.error('No sentences found in session during POST')
        clearValidation(req)
        return res.redirect(`/person/${nomisId}/record-recall/update-sentence-types-summary`)
      }

      // Get court cases to find the sentence type description
      const courtCases = (sessionData?.selectedCases || sessionData?.courtCaseOptions || []) as CourtCase[]
      const targetCase = courtCases.find(c => c.caseId === courtCaseId)

      if (!targetCase) {
        logger.error(`Court case not found during POST: ${courtCaseId}`)
        clearValidation(req)
        return res.redirect(`/person/${nomisId}/record-recall/update-sentence-types-summary`)
      }

      // Get the sentence types again to find the description
      const sentenceTypes = await BulkSentenceTypeController.getCommonApplicableSentenceTypes(
        req,
        res,
        sentencesInCase,
        courtCases,
        targetCase,
      )
      const selectedTypeDesc = sentenceTypes.find(t => t.sentenceTypeUuid === sentenceType)?.description

      // Get existing updated sentences or initialize empty object
      const updatedSentences = (sessionData?.updatedSentenceTypes || {}) as Record<
        string,
        { uuid: string; description: string }
      >

      // Apply the selected type to ALL sentences in sentencesInCurrentCase
      sentencesInCase.forEach(({ sentenceUuid }) => {
        updatedSentences[sentenceUuid] = {
          uuid: sentenceType,
          description: selectedTypeDesc || sentenceType,
        }
      })

      // Batch update session with all sentence type mappings and clear temporary keys
      await BulkSentenceTypeController.batchUpdateSessionData(
        req,
        {
          updatedSentenceTypes: updatedSentences,
        },
        {
          bulkUpdateMode: null,
          sentencesInCurrentCase: null,
          currentSentenceIndex: null,
        },
      )

      logger.info('Bulk sentence type update completed', {
        courtCaseId,
        sentenceCount: sentencesInCase.length,
        selectedType: selectedTypeDesc,
      })

      // Clear validation and redirect to summary
      clearValidation(req)
      return res.redirect(`/person/${nomisId}/record-recall/update-sentence-types-summary`)
    } catch (error) {
      logger.error('Error in BulkSentenceTypeController.post', { error: error.message })
      const { nomisId } = res.locals
      clearValidation(req)
      return res.redirect(`/person/${nomisId}/record-recall/update-sentence-types-summary`)
    }
  }
}
