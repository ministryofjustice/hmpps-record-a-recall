import { RecordARecallValidationResult } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'

export interface CreateRecallJourney {
  id: string
  lastTouched: string
  nomsId: string
  isCheckingAnswers: boolean
  revocationDate?: DateParts
  crdsValidationResult: RecordARecallValidationResult
  isManual: boolean
}

export interface DateParts {
  day: number
  month: number
  year: number
}

type PersonJourneyParams = { nomsId: string; journeyId: string }
