import { RecallEligibility } from '../recallEligibility'
import { SummaryListRow } from '../govuk'

declare module 'models' {
  import { RecallType } from '../recallTypes'
  import { CalculatedReleaseDates } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'

  export interface Recall {
    recallId: string
    createdAt: string
    revocationDate: Date
    returnToCustodyDate: Date
    ual: number
    ualString: string
    recallType: RecallType
    calculation?: CalculatedReleaseDates
    isFixedTermRecall?: boolean
    location: string
    locationName?: string
    sentenceIds: string[]
    courtCaseIds: string[]
  }

  export interface UAL {
    recallId?: string
    nomisId?: string
    bookingId?: number
    firstDay: Date
    lastDay: Date
    days?: number
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
  export type conflicting = {
    sentenceId?: string
    recallEligibility: RecallEligibility
    summary: SummaryListRow[]
    offenceCode: string
    offenceDescription?: string
    unadjustedSled?: string
    sentenceLengthDays?: number
  }
}
