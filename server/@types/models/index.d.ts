declare module 'models' {
  import { RecallType } from '../refData'

  export interface Recall {
    recallDate: Date
    returnToCustodyDate: Date
    recallType: RecallType
  }
}
