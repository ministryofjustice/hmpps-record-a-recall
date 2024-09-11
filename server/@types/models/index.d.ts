import { CalculatedReleaseDates } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'

declare module 'models' {
  import type { DateForm } from 'forms'
  import { RecallType } from '../refData'

  export interface Recall {
    recallDateForm?: DateForm
    returnToCustodyDateForm?: DateForm
    recallDate: Date
    returnToCustodyDate: Date
    recallType: RecallType
    calculation?: CalculatedReleaseDates
  }
}
