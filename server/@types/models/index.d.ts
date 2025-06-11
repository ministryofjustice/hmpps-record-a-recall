declare module 'models' {
  import { RecallType } from '../recallTypes'
  import {
    CalculatedReleaseDates,
    SentenceAndOffenceWithReleaseArrangements,
  } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'
  import { ApiCharge } from '../remandAndSentencingApi/remandAndSentencingTypes'

  export interface Recall {
    recallId: string
    createdAt: string
    revocationDate: Date
    returnToCustodyDate: Date
    ual?: UAL
    ualString?: string
    recallType: RecallType
    calculation?: CalculatedReleaseDates
    isFixedTermRecall?: boolean
    location: string
    locationName?: string
    sentenceIds: string[]
    courtCaseIds: string[]
  }

  export interface UAL {
    adjustmentId?: string
    recallId?: string
    nomisId?: string
    bookingId?: number | string
    firstDay: Date | string
    lastDay: Date | string
    days?: number
  }

  export interface CourtCase {
    caseId: string
    status: string
    date: string
    location: string
    locationName?: string
    reference: string
    sentences?: ApiCharge[]
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
    courtDescription?: string
    periodLengths?
  }

  export type SentenceWithDpsUuid = SentenceAndOffenceWithReleaseArrangements & {
    /** Format: UUID * */
    dpsSentenceUuid: string
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
