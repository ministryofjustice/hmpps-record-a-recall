import { ExternalSentenceId } from './calculateReleaseDatesApi/calculateReleaseDatesTypes'

type SentenceDetail = {
  lineSequence: number
  caseSequence: number
  externalSentenceId: ExternalSentenceId
  sentencedAt: string
  sentenceLength: string
  consecutiveTo: number | null
  crd: string
  sled: string
}

type SentenceDetailExtended = SentenceDetail & {
  sentenceCalculationType: string
  sentenceCategory: string
}

export { SentenceDetail, SentenceDetailExtended }
