import { ineligibleTypes, RecallType, RecallTypes } from './recallTypes'

type RecallEligibility = {
  code: string
  description: string
  recallRoute: RecallRoute
  ineligibleRecallTypes?: RecallType[]
  affectsEnvelope: boolean
}

type RecallRoute = 'NORMAL' | 'MANUAL' | 'NOT_POSSIBLE'

const eligibilityReasons = {
  HAPPY_PATH_POSSIBLE: {
    code: 'HAPPY_PATH_POSSIBLE',
    description: 'Normal user journey possible',
    recallRoute: 'NORMAL',
    affectsEnvelope: false,
  },
  CRITICAL_VALIDATION_FAIL: {
    code: 'CRITICAL_VALIDATION_FAIL',
    description: 'CRDS returned a critical validation failure',
    recallRoute: 'NOT_POSSIBLE',
    affectsEnvelope: true,
  },
  NON_CRITICAL_VALIDATION_FAIL: {
    code: 'NON_CRITICAL_VALIDATION_FAIL',
    description: 'CRDS returned a validation failure that is not critical',
    recallRoute: 'MANUAL',
    affectsEnvelope: true,
  },
  NO_SENTENCE_START: {
    code: 'NO_SENTENCE_START',
    description: 'No sentence start date in breakdown - only manual recall possible',
    recallRoute: 'MANUAL',
    affectsEnvelope: true,
  },
  NO_CRD: {
    code: 'NO_CRD',
    description: 'No CRD in breakdown - only manual recall possible',
    recallRoute: 'MANUAL',
    affectsEnvelope: true,
  },
  NO_SLED_OR_SED: {
    code: 'NO_SLED_OR_SED',
    description: 'No SLED or SED in breakdown - only manual recall possible',
    recallRoute: 'MANUAL',
    affectsEnvelope: true,
  },
  NO_BREAKDOWN: {
    code: 'NO_BREAKDOWN',
    description: 'No calculation breakdown for sentence - only manual recall possible',
    recallRoute: 'MANUAL',
    affectsEnvelope: true,
  },
  RECALL_DATE_BEFORE_SENTENCE_START: {
    code: 'RECALL_DATE_BEFORE_SENTENCE_START',
    description: 'Provided revocation date is before the start of this sentence',
    recallRoute: 'NOT_POSSIBLE',
    affectsEnvelope: false,
  },
  RECALL_DATE_BEFORE_RELEASE_DATE: {
    code: 'RECALL_DATE_BEFORE_RELEASE_DATE',
    description: 'Provided revocation date is before the conditional release date',
    recallRoute: 'NOT_POSSIBLE',
    affectsEnvelope: false,
  },
  RECALL_DATE_AFTER_EXPIRATION_DATE: {
    code: 'RECALL_DATE_AFTER_EXPIRATION_DATE',
    description: 'Provided revocation date is after the expiration of this sentence',
    recallRoute: 'NOT_POSSIBLE',
    affectsEnvelope: false,
  },
  RAS_LEGACY_SENTENCE: {
    code: 'RAS_LEGACY_SENTENCE',
    description: 'This is a legacy sentence retrieved from RaS and has no associated calculation',
    recallRoute: 'MANUAL',
    affectsEnvelope: true,
  },
  NON_SDS: {
    code: 'NON_SDS',
    description: 'Non-SDS Sentence - only standard recall possible',
    recallRoute: 'MANUAL',
    affectsEnvelope: true,
    ineligibleRecallTypes: ineligibleTypes([RecallTypes.STANDARD_RECALL]),
  },
  INDETERMINATE: {
    code: 'INDETERMINATE',
    description: 'Indeterminate Sentence - only standard recall possible',
    recallRoute: 'NORMAL',
    affectsEnvelope: true,
    ineligibleRecallTypes: ineligibleTypes([RecallTypes.STANDARD_RECALL]),
  },
  SOPC: {
    code: 'SOPC',
    description: 'SOPC Sentence - only standard recall possible',
    recallRoute: 'NORMAL',
    affectsEnvelope: true,
    ineligibleRecallTypes: ineligibleTypes([RecallTypes.STANDARD_RECALL]),
  },
  HDC: {
    code: 'HDC',
    description: 'SDS sentence - HDC',
    recallRoute: 'MANUAL',
    affectsEnvelope: true,
    ineligibleRecallTypes: ineligibleTypes([
      RecallTypes.HDC_FOURTEEN_DAY_RECALL,
      RecallTypes.HDC_TWENTY_EIGHT_DAY_RECALL,
      RecallTypes.HDC_INABILITY_TO_MONITOR_RECALL,
      RecallTypes.HDC_CURFEW_VIOLATION_RECALL,
      // 14/28 can't be determined at an individual sentence level
    ]),
  },
  SDS: {
    code: 'SDS',
    description: 'SDS sentence',
    recallRoute: 'NORMAL',
    affectsEnvelope: true,
    ineligibleRecallTypes: ineligibleTypes([
      RecallTypes.STANDARD_RECALL,
      RecallTypes.FOURTEEN_DAY_FIXED_TERM_RECALL,
      RecallTypes.TWENTY_EIGHT_DAY_FIXED_TERM_RECALL,
      // 14/28 can't be determined at an individual sentence level
    ]),
  },
} as const

export { RecallEligibility, RecallRoute, eligibilityReasons }
