import { Request } from 'express'
import { sessionModelFields } from './formWizardHelper'
import { setSessionValue, unsetSessionValue } from './sessionHelper'

export default function resetRecallSession(req: Request): void {
  // Reset case index and manual recall decisions
  setSessionValue(req, sessionModelFields.CURRENT_CASE_INDEX, 0)
  setSessionValue(req, sessionModelFields.MANUAL_RECALL_DECISIONS, [])

  // Reset sentence-related state
  unsetSessionValue(req, sessionModelFields.ACTIVE_SENTENCE_CHOICE)
  unsetSessionValue(req, sessionModelFields.SENTENCE_GROUPS)
  unsetSessionValue(req, sessionModelFields.UNKNOWN_SENTENCES_TO_UPDATE)
  setSessionValue(req, sessionModelFields.MANUAL_CASE_SELECTION, true)
}
