import { components } from './index'

export type CalculationBreakdown = components['schemas']['CalculationBreakdown']
export type SentenceAndOffenceWithReleaseArrangements =
  components['schemas']['SentenceAndOffenceWithReleaseArrangements']
export type LatestCalculation = components['schemas']['LatestCalculation']
export type ValidationMessage = components['schemas']['ValidationMessage']
export type RecordARecallValidationResult = components['schemas']['RecordARecallValidationResult']
export type RecordARecallRequest = components['schemas']['RecordARecallRequest']
export type RecordARecallDecisionResult = components['schemas']['RecordARecallDecisionResult']
export type RecallableSentence = components['schemas']['RecallableSentence']
export type AutomatedCalculationData = components['schemas']['AutomatedCalculationData']
export type RecallSentenceCalculation = components['schemas']['RecallSentenceCalculation']

export type LicenceDates = {
  sled? : string
  sed?: string
  led?: string
  areDifferent: boolean
}
