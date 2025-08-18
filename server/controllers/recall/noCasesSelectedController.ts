import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'
import RecallBaseController from './recallBaseController'
import { sessionModelFields } from '../../helpers/formWizardHelper'

export default class NoCasesSelectedController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    // Clear any persisted sentence selection state
    req.sessionModel.unset('activeSentenceChoice')
    req.sessionModel.unset('sentenceGroups')
    req.sessionModel.unset('unknownSentencesToUpdate')

    req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)

    const locals = super.locals(req, res)
    return {
      ...locals,
    }
  }
}
