import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import RecallBaseController from './recallBaseController'
import { sessionModelFields } from '../../helpers/formWizardHelper'

export default class ResetAndRedirectToManualController extends RecallBaseController {
  async get(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('--------1-------------------')
      const keysToClear = [
        'activeSentenceChoice',
        'sentenceGroups',
        'unknownSentencesToUpdate',
        'summarisedSentenceGroups',
        'eligibleSentences',
        'manualRecallDecisions',
      ]
      keysToClear.forEach(k => req.sessionModel.unset(k))

      req.sessionModel.set(sessionModelFields.CURRENT_CASE_INDEX, 0)
      req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)

      // // Always reset session state
      // req.sessionModel.set(sessionModelFields.CURRENT_CASE_INDEX, 0)
      // req.sessionModel.set(sessionModelFields.MANUAL_RECALL_DECISIONS, [])
      // req.sessionModel.unset('activeSentenceChoice')
      // req.sessionModel.unset('sentenceGroups')
      // req.sessionModel.unset('unknownSentencesToUpdate')
      // req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)

      // Branch depending on which route we’re on
      if (req.path.endsWith('/reset-to-manual-intercept')) {
        res.redirect(`${req.baseUrl}/manual-recall-intercept`)
      } else if (req.path.endsWith('/reset-to-revocation-date')) {
        res.redirect(`${req.baseUrl}/revocation-date`)
      } else {
        res.redirect(`${req.baseUrl}`)
      }
    } catch (err) {
      next(err)
    }
  }
}
