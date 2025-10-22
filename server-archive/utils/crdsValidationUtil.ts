import { ValidationMessage } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { eligibilityReasons, RecallEligibility } from '../@types/recallEligibility'

export default function determineRecallEligibilityFromValidation(
  validationResponse: ValidationMessage[],
): RecallEligibility {
  if (validationResponse && validationResponse.length === 0) {
    return eligibilityReasons.HAPPY_PATH_POSSIBLE
  }
  const errorCodes = validationResponse.map(v => {
    return v.code
  })
  if (errorCodes.some(code => criticalValidationErrors.includes(code))) {
    return eligibilityReasons.CRITICAL_VALIDATION_FAIL
  }
  return eligibilityReasons.NON_CRITICAL_VALIDATION_FAIL
}

const criticalValidationErrors = [
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
]
