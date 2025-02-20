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
    sentenceIds: string[]
    courtCaseIds: string[]
  }

  export interface CourtCase {
    caseId: string
    status: string
    date: string
    location: string
    locationName?: string
    reference: string
    sentences?: Sentence[]
    sentenced: boolean
  }

  export interface Sentence {
    /** Format: uuid */
    sentenceUuid: string
    chargeNumber?: string
    custodialTerm: Term
    licenceTerm: Term
    sentenceServeType: string
    consecutiveToChargeNumber?: string
    sentenceType?: string
    /** Format: date */
    convictionDate?: string
    offenceDate?: string
    offenceCode: string
    offenceDescription?: string
  }

  export interface Term {
    years?: number
    /** Format: int32 */
    months?: number
    /** Format: int32 */
    weeks?: number
    /** Format: int32 */
    days?: number
    code?: string
  }
}
