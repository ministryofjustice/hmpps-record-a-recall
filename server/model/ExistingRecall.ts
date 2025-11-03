import { PeriodLength } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export interface ExistingRecall {
  recallUuid: string
  prisonerId: string
  source: 'NOMIS' | 'DPS'
  createdAtTimestamp: string
  createdAtLocationName?: string
  canEdit: boolean
  canDelete: boolean
  recallTypeDescription: string
  revocationDate?: string
  returnToCustodyDate?: string
  ualAdjustmentTotalDays?: number
  courtCases: ExistingRecallCourtCase[]
}

export interface ExistingRecallCourtCase {
  courtCaseReference?: string
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
}
