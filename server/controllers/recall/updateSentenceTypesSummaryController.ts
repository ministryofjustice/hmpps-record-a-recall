import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import RemandAndSentencingApiClient from '../../api/remandAndSentencingApiClient'
import { UpdateSentenceTypesRequest } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import logger from '../../../logger'
import { dataAccess } from '../../data'

export default class UpdateSentenceTypesSummaryController extends RecallBaseController {
  /**
   * Placeholder controller for RCLL-451 implementation
   * This controller handles the persistence of sentence type updates via the RaS API
   */

  async saveValues(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courtCaseUuid = req.sessionModel.get('selectedCourtCaseUuid') as string
      const updatedSentenceTypes = (req.sessionModel.get('updatedSentenceTypes') || {}) as Record<string, string>

      // Check if there are any updates to persist
      const sentenceUpdates = Object.entries(updatedSentenceTypes)
      if (!courtCaseUuid || sentenceUpdates.length === 0) {
        // No updates to persist, continue to next step
        return super.saveValues(req, res, next)
      }

      const payload: UpdateSentenceTypesRequest = {
        updates: sentenceUpdates.map(([sentenceUuid, sentenceTypeId]) => ({
          sentenceUuid,
          sentenceTypeId,
        })),
      }

      const { user } = res.locals
      const { hmppsAuthClient } = dataAccess()
      const systemToken = await hmppsAuthClient.getSystemClientToken(user.username)
      const apiClient = new RemandAndSentencingApiClient(systemToken)
      const response = await apiClient.updateSentenceTypes(courtCaseUuid, payload)

      logger.info('Successfully updated sentence types', {
        courtCaseUuid,
        updatedCount: response.updatedSentenceUuids.length,
      })

      // Clear the temporary session data on success
      req.sessionModel.unset('updatedSentenceTypes')
      req.sessionModel.unset('unknownSentencesToUpdate')

      // Continue to the next step
      return super.saveValues(req, res, next)
    } catch (error) {
      logger.error('Failed to update sentence types', {
        error: error.message,
        courtCaseUuid: req.sessionModel.get('selectedCourtCaseUuid'),
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
