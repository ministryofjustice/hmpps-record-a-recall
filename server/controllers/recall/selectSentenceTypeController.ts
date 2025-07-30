import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'

/**
 * TODO: RCLL-452 Implement single sentence type selection controller
 *
 * This controller should:
 * 1. Display details of a single sentence that needs its type updated
 * 2. Show radio buttons for available sentence types (fetch from RaS API or static list?)
 * 3. Pre-populate if editing an already selected type
 * 4. Validate that a selection is made
 * 5. Update the session with the selected type mapping
 * 6. Navigate back to the update-sentence-types-summary page
 *
 * Session fields to use:
 * - updatedSentenceTypes: Record<string, string> - Map of sentenceId to selected type UUID
 * - Get sentence details from court cases in session
 *
 * Example implementation structure:
 *
 * async get(req, res, next) {
 *   const sentenceId = req.params.sentenceId
 *   const courtCases = getCourtCaseOptions(req)
 *   const sentence = findSentenceById(courtCases, sentenceId)
 *   const selectedType = req.sessionModel.get('updatedSentenceTypes')[sentenceId]
 *
 *   res.locals.sentence = sentence
 *   res.locals.selectedType = selectedType
 *   res.locals.sentenceTypeOptions = await getSentenceTypeOptions()
 *
 *   super.get(req, res, next)
 * }
 *
 * async post(req, res, next) {
 *   const sentenceId = req.params.sentenceId
 *   const selectedType = req.body.sentenceType
 *
 *   // Update session
 *   const updatedTypes = req.sessionModel.get('updatedSentenceTypes') || {}
 *   updatedTypes[sentenceId] = selectedType
 *   req.sessionModel.set('updatedSentenceTypes', updatedTypes)
 *
 *   super.post(req, res, next)
 * }
 */
export default class SelectSentenceTypeController extends RecallBaseController {
  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    // TODO: Implement for RCLL-452
    res.locals.placeholderMessage = 'RCLL-452: Single sentence type selection to be implemented'
    super.get(req, res, next)
  }

  async post(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    // TODO: Implement for RCLL-452
    // For now, just redirect back to summary
    res.redirect(`/recall/${res.locals.nomisId}/update-sentence-types-summary`)
  }
}
