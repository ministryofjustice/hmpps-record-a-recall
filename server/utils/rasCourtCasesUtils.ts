import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'

import { getCourtCaseOptions } from '../helpers/formWizardHelper'
import { EnhancedRecallableCourtCase, EnhancedRecallableSentence } from '../middleware/loadCourtCases'

export default function getCourtCaseOptionsFromRas(
  req: Request & { sessionModel?: unknown; session?: { formData?: Record<string, unknown> } },
  res: Response,
): CourtCase[] {
  const sessionCases = getCourtCaseOptions(req)
  if (sessionCases) {
    return sessionCases
  }

  // TODO somewhere here need to go into recalls.source to check if its nomis or not for the count number text
  // courtCase also needs source

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

  return cases.filter((c: CourtCase) => c.status !== 'DRAFT').filter((c: CourtCase) => c.sentenced)
}
