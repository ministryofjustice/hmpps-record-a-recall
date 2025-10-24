import { RecordARecallValidationResult } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'

export interface CreateRecallJourney {
  id: string
  lastTouched: string
  nomsId: string
  isCheckingAnswers: boolean
  crdsValidationResult: RecordARecallValidationResult
  revocationDate?: DateParts
  inCustodyAtRecall?: boolean
  returnToCustodyDate?: DateParts
}

export interface DateParts {
  day: number
  month: number
  year: number
}

type PersonJourneyParams = { nomsId: string; journeyId: string }
