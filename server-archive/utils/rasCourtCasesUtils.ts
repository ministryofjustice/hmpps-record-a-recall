import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import { SessionManager } from '../services/sessionManager'
import { EnhancedRecallableCourtCase, EnhancedRecallableSentence } from '../middleware/loadCourtCases'

export default function getCourtCaseOptionsFromRas(req: Request, res: Response): CourtCase[] {
  const sessionCases = SessionManager.getSessionValue<CourtCase[]>(req, SessionManager.SESSION_KEYS.COURT_CASE_OPTIONS)
  if (sessionCases) {
    return sessionCases
  }

  const cases: CourtCase[] =
    res.locals.recallableCourtCases && Array.isArray(res.locals.recallableCourtCases)
      ? (res.locals.recallableCourtCases as EnhancedRecallableCourtCase[]).map(
          (recallableCase: EnhancedRecallableCourtCase) => ({
            caseId: recallableCase.courtCaseUuid,
            status: recallableCase.status,
            date: recallableCase.date,
            location: recallableCase.courtCode,
            locationName: recallableCase.courtName,
            reference: recallableCase.reference,
            sentenced: recallableCase.isSentenced,
            sentences: (recallableCase.sentences || []).map((sentence: EnhancedRecallableSentence) => ({
              ...sentence,
              offenceDescription: sentence.offenceDescription,
            })),
          }),
        )
      : []

  return cases.filter((c: CourtCase) => c.sentenced)
}
