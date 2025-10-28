import { RecordARecallValidationResult } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'
import {RecallableCourtCase, RecallableCourtCasesResponse} from "../remandAndSentencingApi/remandAndSentencingTypes";

export interface CreateRecallJourney {
  id: string
  lastTouched: string
  nomsId: string
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
