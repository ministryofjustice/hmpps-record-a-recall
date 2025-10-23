export interface CreateRecallJourney {
  id: string
  lastTouched: string
  nomsId: string
  isCheckingAnswers: boolean
  revocationDate?: DateParts
}

export interface DateParts {
  day: number
  month: number
  year: number
}


type PersonJourneyParams = { nomsId: string; journeyId: string }
