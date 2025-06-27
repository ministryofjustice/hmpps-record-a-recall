declare module 'models' {
  import { RecallType } from '../recallTypes'
  import {
    CalculatedReleaseDates,
    SentenceAndOffenceWithReleaseArrangements,
  } from '../calculateReleaseDatesApi/calculateReleaseDatesTypes'
  import { RecallableSentence } from '../remandAndSentencingApi/remandAndSentencingTypes'

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
    sentences?: RecallableSentence[]
    sentenced: boolean
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
