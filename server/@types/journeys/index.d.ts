import { RecordARecallValidationResult } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { ApiRecallType, RecallableCourtCase } from '../remandAndSentencingApi/remandAndSentencingTypes'
import { SentenceAndOffence } from '../recallTypes'
import { ExistingRecall } from '../../model/ExistingRecall'

export interface RecallJourney {
  id: string
  lastTouched: string
  nomsId: string
  isCheckingAnswers: boolean
  crdsValidationResult: RecordARecallValidationResult
  revocationDate?: DateParts
  inCustodyAtRecall?: boolean
  returnToCustodyDate?: DateParts
  recallId?: string
  sentenceIds?: string[]
  recallType?: ApiRecallType
  recallableCourtCases?: DecoratedCourtCase[]
  courtCaseIdsSelectedForRecall?: string[]
  courtCaseIdsExcludedFromRecall?: string[]
  calculationRequestId?: number // this is only set in the auto journey
  recallBeingEditted?: ExistingRecall
}

export interface DateParts {
  day: number
  month: number
  year: number
}

type PersonJourneyParams = { nomsId: string; journeyId: string; createOrEdit: 'edit' | 'create'; recallId?: string }

export type DecoratedCourtCase = RecallableCourtCase & {
  recallableSentences: SentenceAndOffence[]
  nonRecallableSentences: SentenceAndOffence[]
  courtName: string
}
