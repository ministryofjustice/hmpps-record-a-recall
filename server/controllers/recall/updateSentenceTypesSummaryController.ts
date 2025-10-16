import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import BaseController from '../base/BaseController'
import { clearValidation } from '../../middleware/validationMiddleware'
import logger from '../../../logger'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'
import {
  UpdateSentenceTypesRequest,
  RecallableCourtCaseSentence,
} from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'
import { createSentenceToCourtCaseMap } from '../../utils/sentenceHelper'

// Types for court cases with unknown sentences
interface CourtCaseWithUnknownSentences extends CourtCase {
  unknownSentences: RecallableCourtCaseSentence[]
  hasUnknownSentences: boolean
  allSentencesUpdated: boolean
}

export default class UpdateSentenceTypesSummaryController extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = UpdateSentenceTypesSummaryController.getSessionData(req)
    const { nomisId, recallId } = res.locals

    // Get prisoner data
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Determine if edit recall
    const isEditRecall = !!recallId

    // Clean up session state from any sub-flows
    await UpdateSentenceTypesSummaryController.updateSessionData(req, {
      bulkUpdateMode: null,
      sentencesInCurrentCase: null,
      currentSentenceIndex: null,
    })

    // Get court cases from session (look for selectedCases first, then fall back to courtCaseOptions)
    const courtCases = (sessionData?.selectedCases || sessionData?.courtCaseOptions || []) as CourtCase[]
    const updatedSentences = (sessionData?.updatedSentenceTypes || {}) as Record<
      string,
      { uuid: string; description: string }
    >

    // Create compatibility maps for templates
    const updatedSentenceTypes: Record<string, string> = {}
    const updatedSentenceTypeDescriptions: Record<string, string> = {}
    for (const [sentenceUuid, data] of Object.entries(updatedSentences)) {
      updatedSentenceTypes[sentenceUuid] = data.uuid
      updatedSentenceTypeDescriptions[sentenceUuid] = data.description
    }

    // Group court cases with unknown sentences
    const courtCasesWithUnknownSentences = courtCases
      .map((courtCase: CourtCase) => {
        const unknownSentences =
          courtCase.sentences?.filter(
            sentence =>
              sentence.sentenceTypeUuid && sentence.sentenceTypeUuid === SENTENCE_TYPE_UUIDS.UNKNOWN_PRE_RECALL,
          ) || []

        return {
          ...courtCase,
          unknownSentences,
          hasUnknownSentences: unknownSentences.length > 0,
          allSentencesUpdated: unknownSentences.every(
            sentence => updatedSentences[sentence.sentenceUuid] !== undefined,
          ),
        }
      })
      .filter((courtCase: CourtCaseWithUnknownSentences) => courtCase.hasUnknownSentences)

    // Calculate progress
    const totalUnknownSentences = courtCasesWithUnknownSentences.reduce(
      (sum: number, courtCase: CourtCaseWithUnknownSentences) => sum + courtCase.unknownSentences.length,
      0,
    )
    const totalUpdated = Object.keys(updatedSentenceTypes).length
    const allComplete = totalUpdated === totalUnknownSentences && totalUnknownSentences > 0

    // Store the list of unknown sentences for reference
    const unknownSentenceIds = courtCasesWithUnknownSentences.flatMap((courtCase: CourtCaseWithUnknownSentences) =>
      courtCase.unknownSentences.map(s => s.sentenceUuid),
    )
    await UpdateSentenceTypesSummaryController.updateSessionData(req, {
      unknownSentencesToUpdate: unknownSentenceIds,
    })

    // Pre-process data for cleaner template logic
    const unupdatedCases = []
    const updatedCases = []

    for (const courtCase of courtCasesWithUnknownSentences) {
      const unupdatedSentences = courtCase.unknownSentences.filter(s => !updatedSentences[s.sentenceUuid])
      const updatedSentencesList = courtCase.unknownSentences.filter(s => updatedSentences[s.sentenceUuid])

      if (unupdatedSentences.length > 0) {
        unupdatedCases.push({
          ...courtCase,
          sentences: unupdatedSentences,
        })
      }

      if (updatedSentencesList.length > 0) {
        updatedCases.push({
          ...courtCase,
          sentences: updatedSentencesList,
        })
      }
    }

    // Build navigation URLs
    const backLink = isEditRecall
      ? `/person/${nomisId}/edit-recall/${recallId}/select-cases`
      : `/person/${nomisId}/record-recall/select-court-cases`
    const cancelUrl = `/person/${nomisId}/record-recall/confirm-cancel`

    // Load form data from session if not from validation
    if (!res.locals.formResponses) {
      res.locals.formResponses = {}
    }

    res.render('pages/recall/v2/update-sentence-types-summary', {
      prisoner,
      nomisId,
      isEditRecall,
      backLink,
      cancelUrl,
      unupdatedCases,
      updatedCases,
      totalUnknownSentences,
      totalUpdated,
      allComplete,
      updatedSentenceTypes,
      updatedSentenceTypeDescriptions,
      validationErrors: res.locals.validationErrors,
      formResponses: res.locals.formResponses,
      forceUnknownSentenceTypes: process.env.FORCE_UNKNOWN_SENTENCE_TYPES === 'true',
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const sessionData = UpdateSentenceTypesSummaryController.getSessionData(req)
    const { nomisId, recallId, user } = res.locals

    // Validate that all sentences have been updated
    const unknownSentenceIds = (sessionData?.unknownSentencesToUpdate || []) as string[]
    const updatedSentences = (sessionData?.updatedSentenceTypes || {}) as Record<
      string,
      { uuid: string; description: string }
    >

    const allUpdated = unknownSentenceIds.every(sentenceUuid => updatedSentences[sentenceUuid])

    if (!allUpdated) {
      // Set error and redisplay the page
      UpdateSentenceTypesSummaryController.setValidationError(
        req,
        res,
        'sentenceTypes',
        'You must update all sentence types before continuing',
        `/person/${nomisId}/record-recall/update-sentence-types-summary`,
      )
    }

    // Get court cases from session (look for selectedCases first, then fall back to courtCaseOptions)
    const courtCases = (sessionData?.selectedCases || sessionData?.courtCaseOptions || []) as CourtCase[]

    // Check if there are any updates to persist
    const sentenceUpdates = Object.entries(updatedSentences).map(([sentenceUuid, data]) => [
      sentenceUuid,
      data.uuid,
    ]) as Array<[string, string]>

    if (sentenceUpdates.length > 0) {
      // Group sentence updates by their court case UUID
      const updatesByCourtCase: Record<string, Array<{ sentenceUuid: string; sentenceTypeId: string }>> = {}

      const sentenceToCaseMap = createSentenceToCourtCaseMap(courtCases)

      for (const [sentenceUuid, sentenceTypeId] of sentenceUpdates) {
        const foundCourtCase = sentenceToCaseMap.get(sentenceUuid)
        if (foundCourtCase) {
          if (!updatesByCourtCase[foundCourtCase]) {
            updatesByCourtCase[foundCourtCase] = []
          }
          updatesByCourtCase[foundCourtCase].push({ sentenceUuid, sentenceTypeId })
        }
      }

      const allUpdatedUuids: string[] = []

      // Make separate API calls for each court case
      try {
        const updatePromises = Object.entries(updatesByCourtCase).map(async ([courtCaseUuid, updates]) => {
          const payload: UpdateSentenceTypesRequest = { updates }

          const response = await req.services.courtCaseService.updateSentenceTypes(
            courtCaseUuid,
            payload,
            user.username,
          )

          logger.info('Successfully updated sentence types for court case', {
            courtCaseUuid,
            updatedCount: response.updatedSentenceUuids.length,
          })

          return response.updatedSentenceUuids
        })

        // Wait for all updates to complete
        const results = await Promise.all(updatePromises)
        results.forEach(uuids => allUpdatedUuids.push(...uuids))

        logger.info('Successfully updated all sentence types', {
          totalCourtCases: Object.keys(updatesByCourtCase).length,
          totalUpdatedSentences: allUpdatedUuids.length,
        })

        // Update the court case data in session with the new sentence types
        const updatedCourtCases = courtCases.map((courtCase: CourtCase) => ({
          ...courtCase,
          sentences: courtCase.sentences?.map(sentence => {
            const updatedType = updatedSentences[sentence.sentenceUuid]
            if (updatedType) {
              // Return updated sentence with new type information
              return {
                ...sentence,
                sentenceTypeUuid: updatedType.uuid,
                sentenceType: updatedType.description,
                sentenceLegacyData: sentence.sentenceLegacyData
                  ? {
                      ...sentence.sentenceLegacyData,
                      sentenceTypeDesc: updatedType.description,
                    }
                  : undefined,
              }
            }
            // Return unchanged sentence
            return sentence
          }),
        }))

        // Re-summarize the cases with updated sentence types
        const summarisedSentenceGroupsArray = summariseRasCases(updatedCourtCases)
        await UpdateSentenceTypesSummaryController.updateSessionData(req, {
          summarisedSentences: summarisedSentenceGroupsArray,
          courtCaseOptions: updatedCourtCases,
        })
      } catch (error) {
        logger.error('Failed to update sentence types', {
          error: error.message,
        })

        if (error.status === 400) {
          throw new Error('Invalid sentence type update request')
        }

        if (error.status === 404) {
          throw new Error('Court case or sentence not found')
        }

        if (error.status === 422) {
          throw new Error('Unable to update sentence types - business rule violation')
        }

        // Pass other errors up
        throw error
      }
    }

    // Clear the temporary session data on success
    await UpdateSentenceTypesSummaryController.updateSessionData(req, {
      updatedSentenceTypes: null,
      unknownSentencesToUpdate: null,
    })

    // Clear validation and redirect to next step
    clearValidation(req)
    const nextStep = recallId
      ? `/person/${nomisId}/edit-recall/${recallId}/check-sentences`
      : `/person/${nomisId}/record-recall/check-sentences`
    res.redirect(nextStep)
  }
}
