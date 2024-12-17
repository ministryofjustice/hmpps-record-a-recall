declare module 'models' {
  import { RecallType } from '../recallTypes'
  import { CalculatedReleaseDates } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'

  export interface Recall {
    recallDate: Date
    returnToCustodyDate: Date
    ual: string
    recallType: RecallType
    calculation?: CalculatedReleaseDates
    isFixedTermRecall?: boolean
  }
}
