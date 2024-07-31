declare module 'models' {
  import type { DateForm } from 'forms'
  import { RecallType } from '../refData'

  export interface Recall {
    recallDateForm?: DateForm
    recallDate: Date
    returnToCustodyDate: Date
    recallType: RecallType
  }
}
