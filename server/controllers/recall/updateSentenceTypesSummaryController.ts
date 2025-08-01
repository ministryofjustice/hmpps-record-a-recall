import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { UpdateSentenceTypesRequest } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import logger from '../../../logger'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'
import { getCourtCaseOptions, sessionModelFields } from '../../helpers/formWizardHelper'
import loadCourtCaseOptions from '../../middleware/loadCourtCaseOptions'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'

export default class UpdateSentenceTypesSummaryController extends RecallBaseController {
  /**
   * Displays a summary of court cases with unknown sentence types and allows users to update them
   * This controller handles the persistence of sentence type updates via the RaS API
   */

  middlewareSetup() {
    super.middlewareSetup()
    this.use(loadCourtCaseOptions)
  }

  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get court cases from session
      const courtCases = getCourtCaseOptions(req)
      const updatedSentences = (req.sessionModel.get(sessionModelFields.UPDATED_SENTENCE_TYPES) || {}) as Record<
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
        .map(courtCase => {
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
        .filter(courtCase => courtCase.hasUnknownSentences)

      // Calculate progress
      const totalUnknownSentences = courtCasesWithUnknownSentences.reduce(
        (sum, courtCase) => sum + courtCase.unknownSentences.length,
        0,
      )
      const totalUpdated = Object.keys(updatedSentenceTypes).length
      const allComplete = totalUpdated === totalUnknownSentences && totalUnknownSentences > 0

      // Store the list of unknown sentences for reference
      const unknownSentenceIds = courtCasesWithUnknownSentences.flatMap(courtCase =>
        courtCase.unknownSentences.map(s => s.sentenceUuid),
      )
      req.sessionModel.set(sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE, unknownSentenceIds)

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

      res.locals.unupdatedCases = unupdatedCases
      res.locals.updatedCases = updatedCases
      res.locals.totalUnknownSentences = totalUnknownSentences
      res.locals.totalUpdated = totalUpdated
      res.locals.allComplete = allComplete
      res.locals.updatedSentenceTypes = updatedSentenceTypes
      res.locals.updatedSentenceTypeDescriptions = updatedSentenceTypeDescriptions

      super.get(req, res, next)
    } catch (error) {
      next(error)
    }
  }

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    // Validate that all sentences have been updated
    const unknownSentenceIds = (req.sessionModel.get(sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE) || []) as string[]
    const updatedSentences = (req.sessionModel.get(sessionModelFields.UPDATED_SENTENCE_TYPES) || {}) as Record<
      string,
      { uuid: string; description: string }
    >

    const allUpdated = unknownSentenceIds.every(sentenceUuid => updatedSentences[sentenceUuid])

    if (!allUpdated) {
      // Set error and redisplay the page
      const errors = {
        sentenceTypes: {
          text: 'You must update all sentence types before continuing',
        },
      }
      const errorSummary = [
        {
          text: 'You must update all sentence types before continuing',
          href: '#sentence-types',
        },
      ]

      req.sessionModel.set('errors', errors)
      res.locals.errors = errors
      res.locals.errorSummary = errorSummary

      // Use super.get() to render the page without re-running the data preparation logic
      return super.get(req, res, next)
    }

    // All validated, continue with the parent post method
    return super.post(req, res, next)
  }

  async saveValues(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedSentences = (req.sessionModel.get(sessionModelFields.UPDATED_SENTENCE_TYPES) || {}) as Record<
        string,
        { uuid: string; description: string }
      >
      const courtCases = getCourtCaseOptions(req)

      // Check if there are any updates to persist
      const sentenceUpdates = Object.entries(updatedSentences).map(([sentenceUuid, data]) => [
        sentenceUuid,
        data.uuid,
      ]) as Array<[string, string]>
      if (sentenceUpdates.length === 0) {
        // No updates to persist, continue to next step
        return super.saveValues(req, res, next)
      }

      // Group sentence updates by their court case UUID
      const updatesByCourtCase: Record<string, Array<{ sentenceUuid: string; sentenceTypeId: string }>> = {}

      // Find which court case each sentence belongs to
      for (const [sentenceUuid, sentenceTypeId] of sentenceUpdates) {
        let foundCourtCase: string | null = null

        for (const courtCase of courtCases) {
          const sentenceExists = courtCase.sentences?.some(sentence => sentence.sentenceUuid === sentenceUuid)

          if (sentenceExists) {
            foundCourtCase = courtCase.caseId
            break
          }
        }

        if (foundCourtCase) {
          if (!updatesByCourtCase[foundCourtCase]) {
            updatesByCourtCase[foundCourtCase] = []
          }
          updatesByCourtCase[foundCourtCase].push({ sentenceUuid, sentenceTypeId })
        }
      }

      const { user } = res.locals
      const allUpdatedUuids: string[] = []

      // Make separate API calls for each court case
      const updatePromises = Object.entries(updatesByCourtCase).map(async ([courtCaseUuid, updates]) => {
        const payload: UpdateSentenceTypesRequest = { updates }

        try {
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
        } catch (error) {
          logger.error('Failed to update sentence types for court case', {
            error: error.message,
            courtCaseUuid,
          })
          throw error
        }
      })

      // Wait for all updates to complete
      const results = await Promise.all(updatePromises)
      results.forEach(uuids => allUpdatedUuids.push(...uuids))

      logger.info('Successfully updated all sentence types', {
        totalCourtCases: Object.keys(updatesByCourtCase).length,
        totalUpdatedSentences: allUpdatedUuids.length,
      })

      // Update the court case data in session with the new sentence types
      const updatedCourtCases = courtCases.map(courtCase => ({
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
      req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, summarisedSentenceGroupsArray)
      req.sessionModel.set(sessionModelFields.COURT_CASE_OPTIONS, updatedCourtCases)

      // Clear the temporary session data on success
      // TODO: doubel check this logic for bulk and multiple sentence type updates
      req.sessionModel.unset(sessionModelFields.UPDATED_SENTENCE_TYPES)
      req.sessionModel.unset(sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE)

      // Continue to the next step
      return super.saveValues(req, res, next)
    } catch (error) {
      logger.error('Failed to update sentence types', {
        error: error.message,
      })

      if (error.status === 400) {
        const validationError = new Error('Invalid sentence type update request')
        return next(validationError)
      }

      if (error.status === 404) {
        const notFoundError = new Error('Court case or sentence not found')
        return next(notFoundError)
      }

      if (error.status === 422) {
        const businessError = new Error('Unable to update sentence types - business rule violation')
        return next(businessError)
      }

      // Pass other errors to the error handler
      return next(error)
    }
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const updatedSentences = (req.sessionModel.get(sessionModelFields.UPDATED_SENTENCE_TYPES) || {}) as Record<
      string,
      { uuid: string; description: string }
    >
    const unknownSentences = (req.sessionModel.get(sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE) || []) as string[]

    // Create compatibility maps for templates
    const updatedSentenceTypes: Record<string, string> = {}
    const updatedSentenceTypeDescriptions: Record<string, string> = {}
    for (const [sentenceUuid, data] of Object.entries(updatedSentences)) {
      updatedSentenceTypes[sentenceUuid] = data.uuid
      updatedSentenceTypeDescriptions[sentenceUuid] = data.description
    }

    res.locals.updatedSentenceTypes = updatedSentenceTypes
    res.locals.updatedSentenceTypeDescriptions = updatedSentenceTypeDescriptions
    res.locals.unknownSentences = unknownSentences
    res.locals.totalToUpdate = unknownSentences.length
    res.locals.totalUpdated = Object.keys(updatedSentences).length

    return super.locals(req, res)
  }
}
