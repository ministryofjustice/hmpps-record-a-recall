import { RecordARecallValidationResult } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { RecallableCourtCase } from '../remandAndSentencingApi/remandAndSentencingTypes'

export interface CreateRecallJourney {
  id: string
  lastTouched: string
  nomsId: string
  isCheckingAnswers: boolean
  crdsValidationResult: RecordARecallValidationResult
  revocationDate?: DateParts
  inCustodyAtRecall?: boolean
  returnToCustodyDate?: DateParts
  recallableCourtCases?: RecallableCourtCase[]
}

export interface DateParts {
  day: number
  month: number
  year: number
}

type PersonJourneyParams = { nomsId: string; journeyId: string }
