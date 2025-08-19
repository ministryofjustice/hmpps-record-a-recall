import FormWizard from 'hmpo-form-wizard'
import { sessionModelFields } from './formWizardHelper'

export default function resetRecallSession(req: FormWizard.Request): void {
  // Reset case index and manual recall decisions
  req.sessionModel.set(sessionModelFields.CURRENT_CASE_INDEX, 0)
  req.sessionModel.set(sessionModelFields.MANUAL_RECALL_DECISIONS, [])

  // Reset sentence-related state
  req.sessionModel.unset(sessionModelFields.ACTIVE_SENTENCE_CHOICE)
  req.sessionModel.unset(sessionModelFields.SENTENCE_GROUPS)
  req.sessionModel.unset(sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE)
  req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, true)
}
