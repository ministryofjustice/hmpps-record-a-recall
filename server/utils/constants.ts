/**
 * Shared constants for recall routing and eligibility calculations
 */

const CRITICAL_VALIDATION_ERRORS = [
  'EDS18_EDS21_EDSU18_SENTENCE_TYPE_INCORRECT',
  'EDS_LICENCE_TERM_LESS_THAN_ONE_YEAR',
  'EDS_LICENCE_TERM_MORE_THAN_EIGHT_YEARS',
  'LASPO_AR_SENTENCE_TYPE_INCORRECT',
  'MORE_THAN_ONE_IMPRISONMENT_TERM',
  'MORE_THAN_ONE_LICENCE_TERM',
  'OFFENCE_DATE_AFTER_SENTENCE_RANGE_DATE',
  'OFFENCE_DATE_AFTER_SENTENCE_START_DATE',
  'OFFENCE_MISSING_DATE',
  'SEC236A_SENTENCE_TYPE_INCORRECT',
  'SEC_91_SENTENCE_TYPE_INCORRECT',
  'SENTENCE_HAS_MULTIPLE_TERMS',
  'SENTENCE_HAS_NO_IMPRISONMENT_TERM',
  'SENTENCE_HAS_NO_LICENCE_TERM',
  'SOPC18_SOPC21_SENTENCE_TYPE_INCORRECT',
  'SOPC_LICENCE_TERM_NOT_12_MONTHS',
  'ZERO_IMPRISONMENT_TERM',
  'REMAND_ON_OR_AFTER_SENTENCE_DATE',
  'UNSUPPORTED_SENTENCE_TYPE',
] as const

export type CriticalValidationError = (typeof CRITICAL_VALIDATION_ERRORS)[number]

export function isCriticalValidationError(code: string): code is CriticalValidationError {
  return (CRITICAL_VALIDATION_ERRORS as readonly string[]).includes(code)
}

/**
 * Recall period constants for fixed-term recall calculations
 */
export const RECALL_PERIODS = {
  FOURTEEN_DAYS: 14,
  TWENTY_EIGHT_DAYS: 28,
} as const

/**
 * Sentence threshold constants for recall eligibility
 */
export const SENTENCE_THRESHOLDS = {
  TWELVE_MONTHS_IN_DAYS: 365,
} as const

/**
 * Validation error codes used in recall eligibility checks
 */
export const RECALL_VALIDATION_ERRORS = {
  OFFENCE_DATE_AFTER_SENTENCE_START_DATE: 'OFFENCE_DATE_AFTER_SENTENCE_START_DATE',
  ADJUSTMENT_FUTURE_DATED_UAL: 'ADJUSTMENT_FUTURE_DATED_UAL',
  FTR_SENTENCES_CONFLICT_WITH_EACH_OTHER: 'FTR_SENTENCES_CONFLICT_WITH_EACH_OTHER',
  UNSUPPORTED_SENTENCE_TYPE: 'UNSUPPORTED_SENTENCE_TYPE',
} as const

/**
 * Recall route types for routing decisions
 */
export type RecallRoute = 'NORMAL' | 'MANUAL_REVIEW_REQUIRED' | 'NO_SENTENCES_FOR_RECALL' | 'CONFLICTING_ADJUSTMENTS'

/**
 * Determines routing based on CRDS validation messages
 * Centralizes routing logic to avoid duplication between services
 */
export function determineCrdsRouting(validationMessages: Array<{ code: string }>): RecallRoute {
  if (!validationMessages || validationMessages.length === 0) {
    return 'NORMAL'
  }

  const errorCodes = validationMessages.map(v => v.code)
  if (errorCodes.some(code => isCriticalValidationError(code))) {
    return 'NO_SENTENCES_FOR_RECALL'
  }

  return 'MANUAL_REVIEW_REQUIRED'
}

export default CRITICAL_VALIDATION_ERRORS
