import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'

/**
 * TODO: RCLL-453 - Implement bulk sentence type controller
 *
 * This controller is for selecting a single sentence type to apply to all
 * sentences in a court case.
 *
 * Implementation requirements:
 * 1. Display the court case details and number of sentences
 * 2. Show radio buttons for available sentence types
 * 3. On submit, apply the selected type to all sentences in the court case
 * 4. Update session with all sentence type mappings
 * 5. Navigate back to update-sentence-types-summary
 *
 * Session management:
 * - Read SENTENCES_IN_CURRENT_CASE with the flag isUnknownSentenceType to know which sentences to update
 * - Update updatedSentenceTypes with all sentences mapped to selected type
 */
export default class BulkSentenceTypeController extends RecallBaseController {
  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    // TODO: Implement for RCLL-453
    const { courtCaseId } = req.params
    res.locals.courtCaseId = courtCaseId
    res.locals.placeholderMessage = 'RCLL-453: Bulk sentence type selection to be implemented'
    super.get(req, res, next)
  }

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    // TODO: Implement for RCLL-453
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const selectedType = req.body.sentenceType
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { courtCaseId } = req.params

    // TODO: Get all sentence IDs for this court case
    // TODO: Update updatedSentenceTypes in session with all sentences -> selectedType

    // For now we redirect back to summary
    res.redirect(`/recall/${res.locals.nomisId}/update-sentence-types-summary`)
  }
}
