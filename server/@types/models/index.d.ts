declare module 'models' {
  import { RecallType } from '../recallTypes'
  import { CalculatedReleaseDates } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'

  export interface Recall {
    recallId: string
    createdAt: string
    recallDate: Date
    returnToCustodyDate: Date
    ual: number
    ualString: string
    recallType: RecallType
    calculation?: CalculatedReleaseDates
    isFixedTermRecall?: boolean
    location: string
  }

  export interface CourtCase {
    caseId: string
    status: string
    date: string
    location: string
    reference: string
    sentences?: string[]
    sentenced: boolean
  }
}
