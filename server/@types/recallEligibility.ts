type RecallEligibility = {
  code: string
  description: string
  recallOptions: RecallOptions
  affectsEnvelope: boolean
}

type RecallOptions = 'ALL' | 'STANDARD_ONLY' | 'MANUAL_ONLY' | 'NOT_POSSIBLE'

const eligibilityReasons = {
  HAPPY_PATH_POSSIBLE: {
    code: 'HAPPY_PATH_POSSIBLE',
    description: 'Normal user journey possible',
    recallOptions: 'ALL',
    affectsEnvelope: false,
  },
  NON_SDS: {
    code: 'NON_SDS',
    description: 'Non-SDS Sentence - only standard recall possible',
    recallOptions: 'STANDARD_ONLY',
    affectsEnvelope: true,
  },
  NO_SENTENCE_START: {
    code: 'NO_SENTENCE_START',
    description: 'No sentence start date in breakdown - only manual recall possible',
    recallOptions: 'MANUAL_ONLY',
    affectsEnvelope: true,
  },
  NO_CRD: {
    code: 'NO_CRD',
    description: 'No CRD in breakdown - only manual recall possible',
    recallOptions: 'MANUAL_ONLY',
    affectsEnvelope: true,
  },
  NO_SLED_OR_SED: {
    code: 'NO_SLED_OR_SED',
    description: 'No SLED or SED in breakdown - only manual recall possible',
    recallOptions: 'MANUAL_ONLY',
    affectsEnvelope: true,
  },
  NO_BREAKDOWN: {
    code: 'NO_BREAKDOWN',
    description: 'No calculation breakdown for sentence - only manual recall possible',
    recallOptions: 'MANUAL_ONLY',
    affectsEnvelope: true,
  },
  RECALL_DATE_BEFORE_SENTENCE_START: {
    code: 'RECALL_DATE_BEFORE_SENTENCE_START',
    description: 'Provided revocation date is before the start of this sentence',
    recallOptions: 'NOT_POSSIBLE',
    affectsEnvelope: false,
  },
  RECALL_DATE_BEFORE_RELEASE_DATE: {
    code: 'RECALL_DATE_BEFORE_RELEASE_DATE',
    description: 'Provided revocation date is before the conditional release date',
    recallOptions: 'NOT_POSSIBLE',
    affectsEnvelope: false,
  },
  RECALL_DATE_AFTER_EXPIRATION_DATE: {
    code: 'RECALL_DATE_AFTER_EXPIRATION_DATE',
    description: 'Provided revocation date is after the expiration of this sentence',
    recallOptions: 'NOT_POSSIBLE',
    affectsEnvelope: false,
  },
  RAS_SENTENCE: {
    code: 'RAS_SENTENCE',
    description: 'This sentence is retrieved from RaS and has no associated calculation',
    recallOptions: 'MANUAL_ONLY',
    affectsEnvelope: true,
  },
} as const

export { RecallEligibility, RecallOptions, eligibilityReasons }
