import { NextFunction, Request, Response } from 'express'
import type { EnhancedRecallableCourtCase, EnhancedRecallableSentence } from './loadCourtCases'
import { getSessionValue, setSessionValue } from '../helpers/sessionHelper'

export default function loadCourtCaseOptions(
  req: Request & { sessionModel?: { get: (key: string) => unknown; set: (key: string, value: unknown) => void } },
  res: Response,
  next: NextFunction,
) {
  // Use new session helper if sessionModel isn't available
  const existingOptions = req.sessionModel
    ? getSessionValue(req, 'courtCaseOptions')
    : getSessionValue(req as Request, 'courtCaseOptions')

  // Return early if already populated
  if (existingOptions) {
    return next()
  }

  if (res.locals.recallableCourtCases && Array.isArray(res.locals.recallableCourtCases)) {
    const enhancedCases = res.locals.recallableCourtCases as EnhancedRecallableCourtCase[]

    const courtCaseOptions = enhancedCases
      .filter(c => c.status !== 'DRAFT' && c.isSentenced)
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

    // Use new session helper if sessionModel isn't available
    if (req.sessionModel) {
      setSessionValue(req, 'courtCaseOptions', courtCaseOptions)
    } else {
      setSessionValue(req as Request, 'courtCaseOptions', courtCaseOptions)
    }
  }

  return next()
}
