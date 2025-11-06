import { RecordARecallValidationResult } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { ApiRecallType, RecallableCourtCase } from '../remandAndSentencingApi/remandAndSentencingTypes'
import { SentenceAndOffence } from '../recallTypes'

export interface CreateRecallJourney {
  id: string
  lastTouched: string
  nomsId: string
  isCheckingAnswers: boolean
  crdsValidationResult: RecordARecallValidationResult
  revocationDate?: DateParts
  inCustodyAtRecall?: boolean
  returnToCustodyDate?: DateParts
  sentenceIds?: string[]
  recallType?: ApiRecallType
  recallableCourtCases?: DecoratedCourtCase[]
  courtCaseIdsSelectedForRecall?: string[]
  calculationRequestId?: number
}

export interface DateParts {
  day: number
  month: number
  year: number
}

type PersonJourneyParams = { nomsId: string; journeyId: string }

export type DecoratedCourtCase = RecallableCourtCase & {
  recallableSentences: SentenceAndOffence[]
  nonRecallableSentences: SentenceAndOffence[]
  courtName: string
}
