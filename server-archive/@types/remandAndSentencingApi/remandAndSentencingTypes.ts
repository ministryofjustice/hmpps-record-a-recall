import { components } from './index'

export type CreateRecall = components['schemas']['CreateRecall']
export type CreateRecallResponse = components['schemas']['SaveRecallResponse']
export type ApiRecall = components['schemas']['Recall']

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
