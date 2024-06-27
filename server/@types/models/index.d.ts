declare module 'models' {
  import { RecallTypeCode } from '../refData'

  export interface Recall {
    recallDate: Date
    returnToCustodyDate: Date
    recallType: RecallTypeCode
  }
}
