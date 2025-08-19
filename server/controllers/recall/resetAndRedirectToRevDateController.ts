import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import RecallBaseController from './recallBaseController'
import { sessionModelFields } from '../../helpers/formWizardHelper'

export default class ResetAndRedirectToRevDateController extends RecallBaseController {
  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Reset case index and manual recall decisions
      req.sessionModel.set(sessionModelFields.CURRENT_CASE_INDEX, 0)
      req.sessionModel.set(sessionModelFields.MANUAL_RECALL_DECISIONS, [])

      // Reset sentence-related state
      req.sessionModel.unset('activeSentenceChoice')
      req.sessionModel.unset('sentenceGroups')
      req.sessionModel.unset('unknownSentencesToUpdate')
      req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)

      // Redirect to revocation date page
      res.redirect(`${req.baseUrl}/revocation-date`)
    } catch (err) {
      next(err)
    }
  }
}
