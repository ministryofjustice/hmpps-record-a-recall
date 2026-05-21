import { ApiRecallType, PeriodLength } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { ConsecutiveToDetails } from '../@types/recallTypes'

export interface ExistingRecall {
  recallUuid: string
  prisonerId: string
  source: 'NOMIS' | 'DPS'
  createdAtTimestamp: string
  createdAtLocationName?: string
  canEdit: boolean
  canDelete: boolean
  recallTypeCode: ApiRecallType
  recallTypeDescription: string
  revocationDate?: string
  inPrisonOnRevocationDate?: boolean
  returnToCustodyDate?: string
  calculationRequestId?: number
  ualAdjustmentTotalDays?: number
  sentenceIds: string[]
  courtCases: ExistingRecallCourtCase[]
}

export interface ExistingRecallCourtCase {
  courtCaseReference?: string
  courtCaseUuid?: string
  courtName?: string
  courtCaseDate?: string
  sentences?: ExistingRecallSentence[]
}

export interface ExistingRecallSentence {
  sentenceUuid: string
  offenceCode: string
  offenceDescription: string
  offenceStartDate?: string
  offenceEndDate?: string
  sentenceDate?: string
  lineNumber?: string
  countNumber?: string
  periodLengths: PeriodLength[]
  sentenceServeType: string
  sentenceTypeDescription?: string
  consecutiveTo?: ConsecutiveToDetails | null
}
