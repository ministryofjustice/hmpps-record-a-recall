import { components } from './index'

export type CreateRecall = components['schemas']['CreateRecall']
export type CreateRecallResponse = components['schemas']['SaveRecallResponse']
export type ApiRecall = components['schemas']['Recall']
export type ApiRecallType = ApiRecall['recallType']
export type ApiRecalledSentence = components['schemas']['RecalledSentence']

export type RecallableCourtCase = components['schemas']['RecallableCourtCase']
export type RecallableCourtCaseSentence = components['schemas']['RecallableCourtCaseSentence']

export type RecallableCourtCaseSentenceAugmented = components['schemas']['RecallableCourtCaseSentence'] & {
  lineNumber?: string | null
  countNumber?: string | null
}

export type RecallableCourtCasesResponse = components['schemas']['RecallableCourtCasesResponse']

export type RecallableCourtCasesResponseAugmented = {
  cases: (components['schemas']['RecallableCourtCase'] & {
    sentences: RecallableCourtCaseSentenceAugmented[]
  })[]
}

export type SentenceTypeUpdate = components['schemas']['SentenceTypeUpdate']
export type UpdateSentenceTypesRequest = components['schemas']['UpdateSentenceTypeRequest']
export type UpdateSentenceTypesResponse = components['schemas']['UpdateSentenceTypeResponse']

export type SentenceType = components['schemas']['SentenceType']
export type PeriodLength = components['schemas']['PeriodLength']

export type IsRecallPossibleRequest = components['schemas']['IsRecallPossibleRequest']
export type IsRecallPossibleResponse = components['schemas']['IsRecallPossibleResponse']

export type SentenceConsecutiveToDetailsResponse = components['schemas']['SentenceConsecutiveToDetailsResponse']
