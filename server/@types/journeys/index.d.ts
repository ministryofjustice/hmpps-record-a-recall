import { RecordARecallValidationResult } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { RecallableCourtCase } from '../remandAndSentencingApi/remandAndSentencingTypes'

export interface CreateRecallJourney {
  id: string
  lastTouched: string
  nomsId: string
  isManual: boolean
  isCheckingAnswers: boolean
  revocationDate?: DateParts
  crdsValidationResult: RecordARecallValidationResult
  recallableCourtCases?: RecallableCourtCase[]
}

export interface DateParts {
  day: number
  month: number
  year: number
}

type PersonJourneyParams = { nomsId: string; journeyId: string }
