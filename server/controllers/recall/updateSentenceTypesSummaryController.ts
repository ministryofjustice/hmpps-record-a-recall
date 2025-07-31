import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { UpdateSentenceTypesRequest } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import logger from '../../../logger'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'
import { getCourtCaseOptions } from '../../helpers/formWizardHelper'

export default class UpdateSentenceTypesSummaryController extends RecallBaseController {
  /**
   * Controller for RCLL-451 implementation
   * Displays a summary of court cases with unknown sentence types and allows users to update them
   * This controller handles the persistence of sentence type updates via the RaS API
   */

  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get court cases from session
      const courtCases = getCourtCaseOptions(req)
      const updatedSentenceTypes = (req.sessionModel.get('updatedSentenceTypes') || {}) as Record<string, string>

      // Group court cases with unknown sentences
      const courtCasesWithUnknownSentences = courtCases
        .map(courtCase => {
          const unknownSentences =
            courtCase.sentences?.filter(
              sentence => sentence.sentenceTypeUuid === SENTENCE_TYPE_UUIDS.UNKNOWN_PRE_RECALL,
            ) || []

          return {
            ...courtCase,
            unknownSentences,
            hasUnknownSentences: unknownSentences.length > 0,
            allSentencesUpdated: unknownSentences.every(
              sentence => updatedSentenceTypes[sentence.sentenceId || sentence.sentenceUuid],
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
        courtCase.unknownSentences.map(s => s.sentenceId || s.sentenceUuid),
      )
      req.sessionModel.set('unknownSentencesToUpdate', unknownSentenceIds)

      res.locals.courtCasesWithUnknownSentences = courtCasesWithUnknownSentences
      res.locals.totalUnknownSentences = totalUnknownSentences
      res.locals.totalUpdated = totalUpdated
      res.locals.allComplete = allComplete
      res.locals.updatedSentenceTypes = updatedSentenceTypes

      super.get(req, res, next)
    } catch (error) {
      next(error)
    }
  }

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    // Validate that all sentences have been updated
    const unknownSentenceIds = (req.sessionModel.get('unknownSentencesToUpdate') || []) as string[]
    const updatedSentenceTypes = (req.sessionModel.get('updatedSentenceTypes') || {}) as Record<string, string>

    const allUpdated = unknownSentenceIds.every(sentenceId => updatedSentenceTypes[sentenceId])

    if (!allUpdated) {
      // Set error and redisplay the page
      req.sessionModel.set('errors', {
        sentenceTypes: {
          text: 'You must update all sentence types before continuing',
        },
      })

      res.locals.errors = {
        sentenceTypes: {
          text: 'You must update all sentence types before continuing',
        },
      }
      res.locals.errorSummary = [
        {
          text: 'You must update all sentence types before continuing',
          href: '#sentence-types',
        },
      ]

      return this.get(req, res, next)
    }

    // All validated, continue with the parent post method
    return super.post(req, res, next)
  }

  async saveValues(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedSentenceTypes = (req.sessionModel.get('updatedSentenceTypes') || {}) as Record<string, string>
      const courtCases = getCourtCaseOptions(req)

      // Check if there are any updates to persist
      const sentenceUpdates = Object.entries(updatedSentenceTypes)
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
          const sentenceExists = courtCase.sentences?.some(
            sentence => (sentence.sentenceId || sentence.sentenceUuid) === sentenceUuid,
          )

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

      // Clear the temporary session data on success
      req.sessionModel.unset('updatedSentenceTypes')
      req.sessionModel.unset('unknownSentencesToUpdate')

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
    // TODO: Implement display logic for RCLL-451
    // This will show the summary of sentences to update
    const updatedSentenceTypes = (req.sessionModel.get('updatedSentenceTypes') || {}) as Record<string, string>
    const unknownSentences = (req.sessionModel.get('unknownSentencesToUpdate') || []) as string[]

    res.locals.updatedSentenceTypes = updatedSentenceTypes
    res.locals.unknownSentences = unknownSentences
    res.locals.totalToUpdate = unknownSentences.length
    res.locals.totalUpdated = Object.keys(updatedSentenceTypes).length

    return super.locals(req, res)
  }
}
