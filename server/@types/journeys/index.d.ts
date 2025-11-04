import { RecordARecallValidationResult } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { ApiRecallType, RecallableCourtCase } from '../remandAndSentencingApi/remandAndSentencingTypes'

export interface CreateRecallJourney {
  id: string
  lastTouched: string
  nomsId: string
  isManual: boolean
  isCheckingAnswers: boolean
  crdsValidationResult: RecordARecallValidationResult
  revocationDate?: DateParts
  inCustodyAtRecall?: boolean
  returnToCustodyDate?: DateParts
  sentenceIds?: string[]
  recallType?: ApiRecallType
  recallableCourtCases?: RecallableCourtCase[]
  courtCaseIdsSelectedForRecall?: string[]
}

export interface DateParts {
  day: number
  month: number
  year: number
}

type PersonJourneyParams = { nomsId: string; journeyId: string }
