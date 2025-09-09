import { Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import { getCourtCaseOptions } from '../helpers/formWizardHelper'
import { EnhancedRecallableCourtCase, EnhancedRecallableSentence } from '../middleware/loadCourtCases'

export default function getCourtCaseOptionsFromRas(req: FormWizard.Request, res: Response): CourtCase[] {
  const sessionCases = getCourtCaseOptions(req)
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
            sentences: (recallableCase.sentences || []).map((sentence: EnhancedRecallableSentence) => {
              // Log lineNumber and countNumber
              console.log(
                `UTILS@@@@@@@@@@@@@@@ Sentence ${sentence.sentenceUuid} -> lineNumber: ${sentence.lineNumber ?? 'N/A'}, countNumber: ${sentence.countNumber ?? 'N/A'}`
              )

              return {
                ...sentence,
                offenceDescription: sentence.offenceDescription,
              }
            }),
          }),
        )
      : []

  return cases
    .filter((c: CourtCase) => c.status !== 'DRAFT')
    .filter((c: CourtCase) => c.sentenced)
}
