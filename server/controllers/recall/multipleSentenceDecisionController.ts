import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'

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
      res.redirect(`/recall/${res.locals.nomisId}/bulk-sentence-type/${courtCaseId}`)
    } else {
      // Set up for individual selection
      // TODO: Get sentences for this court case
      // TODO: Set CURRENT_SENTENCE_INDEX to 0
      // TODO: Navigate to first sentence
      res.redirect(`/recall/${res.locals.nomisId}/update-sentence-types-summary`)
    }
  }
}
