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
    // TODO: RCLL-453 - Implement multiple sentence decision page
    // For now, redirect to check sentences to avoid broken page
    const { nomisId } = res.locals
    return res.redirect(`/person/${nomisId}/record-recall/check-sentences`)
  }

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    // TODO: RCLL-453 - This POST handler won't be called until the GET method is properly implemented
    // For now, redirect to check sentences since the page isn't being rendered
    const { nomisId } = res.locals
    return res.redirect(`/person/${nomisId}/record-recall/check-sentences`)
  }
}
