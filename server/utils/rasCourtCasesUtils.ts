import { Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import { getCourtCaseOptions } from '../helpers/formWizardHelper'
import { EnhancedRecallableCourtCase, EnhancedRecallableSentence } from '../middleware/loadCourtCases'

export default async function getCourtCaseOptionsFromRas(req: FormWizard.Request, res: Response) {
  const sessionCases = getCourtCaseOptions(req)
  if (!sessionCases) {
    const cases =
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
        : await req.services.courtCaseService.getAllCourtCases(res.locals.nomisId, req.user.username)

    return cases.filter((c: CourtCase) => c.status !== 'DRAFT').filter((c: CourtCase) => c.sentenced)
  }
  return sessionCases
}
