import { NextFunction, Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import type { EnhancedRecallableCourtCase, EnhancedRecallableSentence } from './loadCourtCases'

export default function loadCourtCaseOptions(req: FormWizard.Request, res: Response, next: NextFunction) {
  // Return early if already populated
  if (req.sessionModel.get('courtCaseOptions')) {
    return next()
  }

  if (res.locals.recallableCourtCases && Array.isArray(res.locals.recallableCourtCases)) {
    const enhancedCases = res.locals.recallableCourtCases as EnhancedRecallableCourtCase[]

    const courtCaseOptions = enhancedCases
      .filter(c => c.isSentenced)
      .map(recallableCase => ({
        caseId: recallableCase.courtCaseUuid,
        status: recallableCase.status,
        date: recallableCase.date,
        location: recallableCase.courtCode,
        locationName: recallableCase.courtName,
        reference: recallableCase.reference,
        sentenced: recallableCase.isSentenced,
        sentences: (recallableCase.sentences || []).map((sentence: EnhancedRecallableSentence) => ({
          ...sentence,
          sentenceUuid: sentence.sentenceUuid,
          offenceDescription: sentence.offenceDescription,
        })),
      }))

    req.sessionModel.set('courtCaseOptions', courtCaseOptions)
  }

  return next()
}
