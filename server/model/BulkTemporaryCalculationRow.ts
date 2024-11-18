type BulkRemandCalculationRow = {
  IDENTIFIER: number
  // Inputs
  NOMIS_ID: string
  VALIDATION_PASSED: string
  VALIDATION_MESSAGES: string
  ACTIVE_BOOKING_ID: string
  AGENCY_LOCATION_ID: string

  CASE_SEQUENCE: number
  LINE_SEQUENCE: number
  OFFENCE_DESCRIPTION: string
  OFFENCE_START: string
  OFFENCE_END: string
  CJA_CODE: string
  SENTENCE_CALC_TYPE: string
  SENTENCE_TYPE: string
  SENTENCE_DATE: string
  CUSTODIAL_TERM: string
  LICENSE_PERIOD: string
  CONCURRENT_OR_CONSECUTIVE: string
  UNADJUSTED_LED: string
  ADJUSTED_LED: string
  UNADJUSTED_SLED: string
  ADJUSTED_SLED: string
  UNADJUSTED_CRD: string
  ADJUSTED_CRD: string
  UNADJUSTED_SED: string
  ADJUSTED_SED: string
  UNADJUSTED_APPD: string
  ADJUSTED_APPD: string
  UNADJUSTED_HDCAD: string
  ADJUSTED_HDCAD: string
  TARIFF: string

  // Other Dates
  OVERALL_SLED: string
  OVERALL_CRD: string
  ARD: string
  MTD: string
  HDCAD: string
  HDCED: string
  ESED: string
  PPRD: string
  PED: string

  // Errors
  ERROR_CODE: string
  ERROR_TEXT: string
}

export default BulkRemandCalculationRow
