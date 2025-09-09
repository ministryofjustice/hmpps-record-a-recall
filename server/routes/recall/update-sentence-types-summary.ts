import { Router, Request, Response, NextFunction } from 'express'
import { resolveNextStep } from '../../helpers/journey-resolver'
import { getFullRecallPath } from '../../helpers/routeHelper'
import { getCourtCaseOptions, sessionModelFields } from '../../helpers/recallSessionHelper'
import loadCourtCaseOptions from '../../middleware/loadCourtCaseOptions'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'
import { createSentenceToCourtCaseMap } from '../../helpers/sentenceHelper'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'
import { UpdateSentenceTypesRequest } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import logger from '../../../logger'
import { Services } from '../../services'

const router = Router()

// Schema for the confirmation step (empty as it's just a continue button)
// const updateSentenceTypesSummarySchema = z.object({})

router.get(
  '/update-sentence-types-summary',
  loadCourtCaseOptions,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Clean up session state from any sub-flows
      delete req.session.formData?.[sessionModelFields.BULK_UPDATE_MODE]
      delete req.session.formData?.[sessionModelFields.SENTENCES_IN_CURRENT_CASE]
      delete req.session.formData?.[sessionModelFields.CURRENT_SENTENCE_INDEX]

      // Get court cases from session
      const courtCases = getCourtCaseOptions(req)
      const updatedSentences = (req.session.formData?.[sessionModelFields.UPDATED_SENTENCE_TYPES] || {}) as Record<
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

      req.session.formData = {
        ...req.session.formData,
        [sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE]: unknownSentenceIds,
      }

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

      const { prisoner } = res.locals
      const backLink = `/person/${prisoner.prisonerNumber}/record-recall/check-sentences`

      res.render('pages/recall/update-sentence-types-summary', {
        values: req.session.formData || {},
        errors: req.session.formErrors || {},
        backLink,
        prisoner,
        unupdatedCases,
        updatedCases,
        totalUnknownSentences,
        totalUpdated,
        allComplete,
        updatedSentenceTypes,
        updatedSentenceTypeDescriptions,
      })

      delete req.session.formErrors
    } catch (error) {
      logger.error('Error in update sentence types summary GET', { error: error.message })
      next(error)
    }
  },
)

router.post(
  '/update-sentence-types-summary',
  loadCourtCaseOptions,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the unknown sentence IDs and updated sentences from session
      const unknownSentenceIds = (req.session.formData?.[sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE] ||
        []) as string[]
      const updatedSentences = (req.session.formData?.[sessionModelFields.UPDATED_SENTENCE_TYPES] || {}) as Record<
        string,
        { uuid: string; description: string }
      >

      // Validate that all sentences have been updated
      const allUpdated = unknownSentenceIds.every(sentenceUuid => updatedSentences[sentenceUuid])

      if (!allUpdated) {
        // Set error and redisplay the page
        req.session.formErrors = {
          sentenceTypes: {
            type: 'error',
            message: 'You must update all sentence types before continuing',
          },
        }

        return res.redirect(req.path)
      }

      // Get court cases for updating
      const courtCases = getCourtCaseOptions(req)

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

        const { user } = res.locals
        const allUpdatedUuids: string[] = []

        // Get services from req
        const { services } = req as Request & { services: Services }
        if (!services?.courtCaseService) {
          throw new Error('Court case service not available')
        }

        // Make separate API calls for each court case
        const updatePromises = Object.entries(updatesByCourtCase).map(async ([courtCaseUuid, updates]) => {
          const payload: UpdateSentenceTypesRequest = { updates }

          try {
            const response = await services.courtCaseService.updateSentenceTypes(courtCaseUuid, payload, user.username)

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
        results.forEach((uuids: string[]) => allUpdatedUuids.push(...uuids))

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

        req.session.formData = {
          ...req.session.formData,
          [sessionModelFields.SUMMARISED_SENTENCES]: summarisedSentenceGroupsArray,
          [sessionModelFields.COURT_CASE_OPTIONS]: updatedCourtCases,
        }

        // Clear the temporary session data on success
        delete req.session.formData[sessionModelFields.UPDATED_SENTENCE_TYPES]
        delete req.session.formData[sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE]
      }

      // Track journey history
      if (!req.session.journeyHistory) {
        req.session.journeyHistory = []
      }
      if (!req.session.journeyHistory.includes('/update-sentence-types-summary')) {
        req.session.journeyHistory.push('/update-sentence-types-summary')
      }

      // Determine next step
      const nextStep = resolveNextStep('/update-sentence-types-summary', req.session.formData)
      const fullPath = getFullRecallPath(nextStep, req, res)
      return res.redirect(fullPath)
    } catch (error) {
      logger.error('Error processing update sentence types summary', { error })

      const errorWithStatus = error as { status?: number }
      if (errorWithStatus.status === 400) {
        req.session.formErrors = { api: { type: 'error', message: 'Invalid sentence type update request' } }
      } else if (errorWithStatus.status === 404) {
        req.session.formErrors = { api: { type: 'error', message: 'Court case or sentence not found' } }
      } else if (errorWithStatus.status === 422) {
        req.session.formErrors = {
          api: { type: 'error', message: 'Unable to update sentence types - business rule violation' },
        }
      } else {
        req.session.formErrors = {
          api: { type: 'error', message: 'Failed to update sentence types. Please try again.' },
        }
      }

      return res.redirect(req.path)
    }
  },
)

export default router
