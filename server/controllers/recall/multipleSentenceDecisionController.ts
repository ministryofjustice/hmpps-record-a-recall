import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { getCourtCaseOptions } from '../../helpers/formWizardHelper'
import SENTENCE_TYPE_UUIDS from '../../utils/sentenceTypeConstants'

/**
 * TODO: RCLL-453 Implement multiple sentence decision controller
 *
 * This controller asks the user if they want to apply the same sentence type
 * to all sentences in a court case or select individually.
 *
 * Implementation requirements:
 * 1. Display the court case and number of sentences that need updating
 * 2. Show Yes/No radio buttons
 * 3. If Yes - navigate to bulk sentence type selection
 * 4. If No - set up session for individual sentence selection and navigate to first sentence
 *
 * Session management:
 * - Set BULK_UPDATE_MODE flag
 * - Store SENTENCES_IN_CURRENT_CASE array
 * - Initialise CURRENT_SENTENCE_INDEX for individual flow
 */
export default class MultipleSentenceDecisionController extends RecallBaseController {
  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    // TODO: Implement for RCLL-453
    const { courtCaseId } = req.params
    res.locals.courtCaseId = courtCaseId
    res.locals.placeholderMessage = 'RCLL-453: Multiple sentence decision to be implemented'
    super.get(req, res, next)
  }

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    // TODO: Implement for RCLL-453
    const { sameSentenceType } = req.body
    const { courtCaseId } = req.params

    if (sameSentenceType === 'yes') {
      // Navigate to bulk selection
      return res.redirect(`/recall/${res.locals.nomisId}/bulk-sentence-type/${courtCaseId}`)
    }

    // Set up for individual selection
    const courtCases = getCourtCaseOptions(req)
    const currentCourtCase = courtCases.find(cc => cc.caseId === courtCaseId)

    if (!currentCourtCase) {
      // Handle error - court case not found
      return res.redirect(`/recall/${res.locals.nomisId}/update-sentence-types-summary`)
    }

    // Find all unknown sentences in this court case
    const unknownSentences =
      currentCourtCase.sentences?.filter(
        sentence => sentence.sentenceTypeUuid === SENTENCE_TYPE_UUIDS.UNKNOWN_PRE_RECALL,
      ) || []

    if (unknownSentences.length === 0) {
      // No unknown sentences found, go back to summary
      return res.redirect(`/recall/${res.locals.nomisId}/update-sentence-types-summary`)
    }

    // Get the first sentence that hasn't been updated yet
    const updatedSentenceTypes = (req.sessionModel.get('updatedSentenceTypes') || {}) as Record<string, string>
    const firstUnupdatedSentence = unknownSentences.find(
      sentence => !updatedSentenceTypes[sentence.sentenceId || sentence.sentenceUuid],
    )

    if (firstUnupdatedSentence) {
      const firstSentenceId = firstUnupdatedSentence.sentenceId || firstUnupdatedSentence.sentenceUuid

      // Store the list of sentences for this court case in session for navigation
      const sentenceIds = unknownSentences.map(s => s.sentenceId || s.sentenceUuid)
      req.sessionModel.set('sentencesInCurrentCase', sentenceIds)
      req.sessionModel.set('currentSentenceIndex', 0)
      req.sessionModel.set('bulkUpdateMode', false)

      // Navigate to the first sentence
      return res.redirect(`/recall/${res.locals.nomisId}/select-sentence-type/${firstSentenceId}`)
    }

    // All sentences already updated, go back to summary
    return res.redirect(`/recall/${res.locals.nomisId}/update-sentence-types-summary`)
  }
}
