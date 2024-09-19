declare module 'models' {
  import type { DateForm } from 'forms'
  import { RecallType } from '../refData'
  import { CalculatedReleaseDates } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'

  export interface Recall {
    recallDateForm?: DateForm
    returnToCustodyDateForm?: DateForm
    recallDate: Date
    returnToCustodyDate: Date
    recallType: RecallType
    calculation?: CalculatedReleaseDates
    isFixedTermRecall?: boolean
  }
}
