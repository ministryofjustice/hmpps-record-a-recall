/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals'
import ReturnToCustodyDateController from './returnToCustodyDateController'
import { calculateUal } from '../../utils/utils'
import getJourneyDataFromRequest, {
  sessionModelFields,
  getRevocationDate,
  getPrisoner,
  getExistingAdjustments,
} from '../../helpers/formWizardHelper'

jest.mock('../../helpers/formWizardHelper', () => ({
  __esModule: true,
  default: jest.fn(),
  getPrisoner: jest.fn(),
  getRevocationDate: jest.fn(),
  getExistingAdjustments: jest.fn(),
  sessionModelFields: {
    ENTRYPOINT: 'entrypoint',
    CRDS_ERRORS: 'crdsValidationErrors',
    HAPPY_PATH_FAIL_REASONS: 'autoRecallFailErrors',
    PRISONER: 'prisoner',
    UAL: 'UAL',
    RECALL_ID: 'recallId',
    STORED_RECALL: 'storedRecall',
    STANDARD_ONLY: 'standardOnlyRecall',
    RECALL_TYPE: 'recallType',
    MANUAL_CASE_SELECTION: 'manualCaseSelection',
    COURT_CASE_OPTIONS: 'CourtCaseOptions',
    COURT_CASES: 'courtCases',
    IN_PRISON_AT_RECALL: 'inPrisonAtRecall',
    RTC_DATE: 'returnToCustodyDate',
    REVOCATION_DATE: 'revocationDate',
    ELIGIBLE_SENTENCE_COUNT: 'eligibleSentenceCount',
    SUMMARISED_SENTENCES: 'summarisedSentenceGroups',
    IS_EDIT: 'isEdit',
    RETURN_TO: 'returnTo',
    JOURNEY_COMPLETE: 'journeyComplete',
    SENTENCES: 'sentences',
    TEMP_CALC: 'temporaryCalculation',
    BREAKDOWN: 'breakdown',
    GROUPED_SENTENCES: 'groupedSentences',
    CASES_WITH_ELIGIBLE_SENTENCES: 'casesWithEligibleSentences',
    RECALL_ELIGIBILITY: 'recallEligibility',
    RECALL_TYPE_MISMATCH: 'recallTypeMismatch',
    EXISTING_ADJUSTMENTS: 'existingAdjustments',
    INVALID_RECALL_TYPES: 'invalidRecallTypes',
    CONFLICTING_ADJUSTMENTS: 'conflictingAdjustments',
    RELEVANT_ADJUSTMENT: 'relevantAdjustment',
    UAL_TO_CREATE: 'ualToCreate',
    UAL_TO_EDIT: 'ualToEdit',
    INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS: 'incompatibleTypesAndMultipleConflictingAdjustments',
    HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL: 'hasMultipleOverlappingUalTypeRecall',
  },
}))

jest.mock('../../utils/utils', () => ({
  calculateUal: jest.fn(),
}))

describe('ReturnToCustodyDateController - saveValues', () => {
  let req: any
  let res: any

  let next: jest.Mock
  let returnToCustodyDateController: ReturnToCustodyDateController

  beforeEach(() => {
    req = {
      form: {
        values: {
          returnToCustodyDate: '2023-10-01',
          inPrisonAtRecall: 'false',
        },
      },
      sessionModel: {
        set: jest.fn(),
        unset: jest.fn(),
        get: jest.fn(),
      },
    } as unknown as Request

    res = {
      locals: {
        nomisId: 'A1234BC',
      },
    } as Partial<Response>

    next = jest.fn()
    returnToCustodyDateController = new ReturnToCustodyDateController({ route: '/rtc-date' })
  })

  it('should handle UAL calculation and save relevant session data when out of prison at recall - happy path with no conflicting adjustments', () => {
    const mockUal = { firstDay: '2023-10-01', lastDay: '2023-10-31' }
    const mockPrisonerDetails = { bookingId: 'B1234', nomisId: 'A1234BC' }

    // @ts-expect-error
    getJourneyDataFromRequest.mockReturnValue({
      revocationDate: '2023-09-30',
    })
    // @ts-expect-error
    calculateUal.mockReturnValue(mockUal)
    // @ts-expect-error
    getPrisoner.mockReturnValue(mockPrisonerDetails)
    // @ts-expect-error
    getRevocationDate.mockReturnValue('2023-09-30')
    // @ts-expect-error
    getExistingAdjustments.mockReturnValue([])

    returnToCustodyDateController.saveValues(req, res, next)

    expect(req.sessionModel.set).toHaveBeenCalledWith(
      sessionModelFields.UAL_TO_CREATE,
      expect.objectContaining({
        firstDay: mockUal.firstDay,
        lastDay: mockUal.lastDay,
        nomisId: mockPrisonerDetails.nomisId,
        bookingId: mockPrisonerDetails.bookingId,
      }),
    )
    expect(req.sessionModel.unset).toHaveBeenCalledWith(sessionModelFields.UAL_TO_EDIT)
    expect(next).toHaveBeenCalled()
  })

  it('should have four conflicting adjustments UAL  of type recall adjustments so not bulletpoints but interrupt page', () => {
    const mockUal = { firstDay: '2018-10-02', lastDay: '2018-10-31' }
    const mockPrisonerDetails = { bookingId: 'B1234', nomisId: 'A1234BC' }
    // @ts-expect-error
    getJourneyDataFromRequest.mockReturnValue({
      revocationDate: '2018-10-02',
    })
    // @ts-expect-error
    calculateUal.mockReturnValue(mockUal)
    // @ts-expect-error
    getPrisoner.mockReturnValue(mockPrisonerDetails)
    // @ts-expect-error
    getRevocationDate.mockReturnValue('2018-10-02')
    // @ts-expect-error
    getExistingAdjustments.mockReturnValue([
      {
        id: 'ebf9db45-5780-4788-aa39-7c443d3e1fb1',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-10-19',
        fromDate: '2018-03-27',
        days: 207,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'RECALL' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-18T14:34:57.916685',
        createdDate: '2025-03-18T14:34:57.916685',
        effectiveDays: 207,
        source: 'DPS',
      },
      {
        id: 'bd9c5c4e-b457-4dff-8fbc-799e87385262',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2020-10-22',
        fromDate: '2018-10-24',
        days: 730,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'RECALL' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: '1a7940ba-c127-4037-be10-625d9408a749',
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'DBENTON',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-24T13:46:50.170667',
        createdDate: '2025-03-24T10:49:56.527681',
        effectiveDays: 730,
        source: 'DPS',
      },
      {
        id: '6fa8c572-160d-414e-b7ba-5c3f1a868e41',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-10-23',
        fromDate: '2018-10-20',
        days: 4,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'RECALL' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'DBENTON',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-24T13:46:49.698849',
        createdDate: '2025-03-24T13:46:49.698849',
        effectiveDays: 4,
        source: 'DPS',
      },
      {
        id: 'ba8301b3-2590-4ad2-9b2c-d48df2dadd73',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-10-26',
        fromDate: '2018-10-25',
        days: 2,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'RECALL' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'DBENTON',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-24T13:52:17.394095',
        createdDate: '2025-03-24T13:52:17.394095',
        effectiveDays: 2,
        source: 'DPS',
      },
      {
        id: 'e60f01cb-584d-48a7-bb44-3b720707fd54',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'LAWFULLY_AT_LARGE',
        toDate: '2022-03-27',
        fromDate: '2022-03-27',
        days: 1,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: null,
        lawfullyAtLarge: { affectsDates: 'YES' },
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'Lawfully at large',
        adjustmentArithmeticType: 'NONE',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-31T14:02:10.40516',
        createdDate: '2025-03-31T14:02:10.40516',
        effectiveDays: 1,
        source: 'DPS',
      },
      {
        id: 'a3e751e6-c926-49b7-a156-3fa83c88aa6f',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-03-29',
        fromDate: '2018-03-28',
        days: 2,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'RECALL' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-17T16:59:44.50797',
        createdDate: '2025-03-17T16:57:30.375104',
        effectiveDays: 2,
        source: 'NOMIS',
      },
      {
        id: '6dd9c390-5f64-41f7-8380-0528a4bff1a5',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-03-27',
        fromDate: '2018-03-23',
        days: 5,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'RECALL' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'NOMIS',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-17T17:01:38.24799',
        createdDate: '2025-03-17T17:01:37.591945',
        effectiveDays: 5,
        source: 'NOMIS',
      },
    ])

    returnToCustodyDateController.saveValues(req, res, next)

    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL, true)
    expect(next).toHaveBeenCalled()
  })

  it('should show NO conflicting adjustments - April dates entered are between adjustments but there is no overlap', () => {
    const mockUal = { firstDay: '2018-04-04', lastDay: '2018-04-06' }
    const mockPrisonerDetails = { bookingId: 'B1234', nomisId: 'A1234BC' }
    // @ts-expect-error
    getJourneyDataFromRequest.mockReturnValue({
      revocationDate: '2018-04-04',
    })
    // @ts-expect-error
    calculateUal.mockReturnValue(mockUal)
    // @ts-expect-error
    getPrisoner.mockReturnValue(mockPrisonerDetails)
    // @ts-expect-error
    getRevocationDate.mockReturnValue('2018-04-04')
    // @ts-expect-error
    getExistingAdjustments.mockReturnValue([
      {
        id: 'ebf9db45-5780-4788-aa39-7c443d3e1fb1',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-10-23',
        fromDate: '2018-10-20',
        days: 207,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'SENTENCE_IN_ABSENCE' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-18T14:34:57.916685',
        createdDate: '2025-03-18T14:34:57.916685',
        effectiveDays: 207,
        source: 'DPS',
      },
      {
        id: 'e60f01cb-584d-48a7-bb44-3b720707fd54',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'LAWFULLY_AT_LARGE',
        toDate: '2018-11-19',
        fromDate: '2018-11-11',
        days: 1,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: null,
        lawfullyAtLarge: { affectsDates: 'YES' },
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'Lawfully at large',
        adjustmentArithmeticType: 'NONE',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-31T14:02:10.40516',
        createdDate: '2025-03-31T14:02:10.40516',
        effectiveDays: 1,
        source: 'DPS',
      },
    ])

    returnToCustodyDateController.saveValues(req, res, next)

    expect(req.sessionModel.set).toHaveBeenCalledWith(
      sessionModelFields.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS,
      false,
    )

    expect(req.sessionModel.set).toHaveBeenCalledWith(
      sessionModelFields.UAL_TO_CREATE,
      expect.objectContaining({
        firstDay: mockUal.firstDay,
        lastDay: mockUal.lastDay,
        nomisId: mockPrisonerDetails.nomisId,
        bookingId: mockPrisonerDetails.bookingId,
      }),
    )
    expect(next).toHaveBeenCalled()
  })

  it('should have 1 conflicting adjustment of LAL  and one non-recall UAL therefore shows interrupt page', () => {
    const mockUal = { firstDay: '2018-11-03', lastDay: '2018-11-18' }
    const mockPrisonerDetails = { bookingId: 'B1234', nomisId: 'A1234BC' }
    // @ts-expect-error
    getJourneyDataFromRequest.mockReturnValue({
      revocationDate: '2018-11-03',
    })
    // @ts-expect-error
    calculateUal.mockReturnValue(mockUal)
    // @ts-expect-error
    getPrisoner.mockReturnValue(mockPrisonerDetails)
    // @ts-expect-error
    getRevocationDate.mockReturnValue('2018-10-02')
    // @ts-expect-error
    getExistingAdjustments.mockReturnValue([
      {
        id: 'ebf9db45-5780-4788-aa39-7c443d3e1fb1',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-10-23',
        fromDate: '2018-10-20',
        days: 207,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'SENTENCE_IN_ABSENCE' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-18T14:34:57.916685',
        createdDate: '2025-03-18T14:34:57.916685',
        effectiveDays: 207,
        source: 'DPS',
      },
      {
        id: 'e60f01cb-584d-48a7-bb44-3b720707fd54',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'LAWFULLY_AT_LARGE',
        toDate: '2018-11-19',
        fromDate: '2018-11-11',
        days: 1,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: null,
        lawfullyAtLarge: { affectsDates: 'YES' },
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'Lawfully at large',
        adjustmentArithmeticType: 'NONE',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-31T14:02:10.40516',
        createdDate: '2025-03-31T14:02:10.40516',
        effectiveDays: 1,
        source: 'DPS',
      },
    ])

    returnToCustodyDateController.saveValues(req, res, next)

    // expect(req.sessionModel.set).toHaveBeenCalledWith(
    //   sessionModelFields.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS,
    //   expect.anything(),
    // )
    expect(req.sessionModel.set).toHaveBeenCalledWith(
      sessionModelFields.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS,
      true,
    )
    //   expect(req.sessionModel.set).toHaveBeenCalledWith(
    //       sessionModelFields.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL,
    //       false,
    //     )

    expect(next).toHaveBeenCalled()
  })

  // FAIL ATM AS CODE IS JUST DOING HAPPY PATH as its picking up conflicting
  // ual recall but not the LAL and relvevant adjustments is empty
  it('should have 1 conflicting adjustment of LAL AND (as there is more than 1 overlapping adjustment of UAL type recall) shows interrupt page', () => {
    const mockUal = { firstDay: '2018-04-02', lastDay: '2018-11-03' }
    const mockPrisonerDetails = { bookingId: 'B1234', nomisId: 'A1234BC' }
    // @ts-expect-error
    getJourneyDataFromRequest.mockReturnValue({
      revocationDate: '2018-11-03',
    })
    // @ts-expect-error
    calculateUal.mockReturnValue(mockUal)
    // @ts-expect-error
    getPrisoner.mockReturnValue(mockPrisonerDetails)
    // @ts-expect-error
    getRevocationDate.mockReturnValue('2018-04-02')
    // @ts-expect-error
    getExistingAdjustments.mockReturnValue([
      {
        id: 'ebf9db45-5780-4788-aa39-7c443d3e1fb1',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-10-23',
        fromDate: '2018-10-20',
        days: 207,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'RECALL' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2018-03-25T14:34:57.916685',
        createdDate: '2018-10-26T14:34:57.916685',
        effectiveDays: 207,
        source: 'DPS',
      },
      {
        id: 'e60f01cb-584d-48a7-bb44-3b720707fd54',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'LAWFULLY_AT_LARGE',
        toDate: '2018-11-19',
        fromDate: '2018-11-11',
        days: 1,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: null,
        lawfullyAtLarge: { affectsDates: 'YES' },
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'Lawfully at large',
        adjustmentArithmeticType: 'NONE',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-31T14:02:10.40516',
        createdDate: '2025-03-31T14:02:10.40516',
        effectiveDays: 1,
        source: 'DPS',
      },
      {
        id: '6fa8c572-160d-414e-b7ba-5c3f1a868e41',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-10-23',
        fromDate: '2018-10-20',
        days: 4,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'RECALL' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'DBENTON',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-24T13:46:49.698849',
        createdDate: '2025-03-24T13:46:49.698849',
        effectiveDays: 4,
        source: 'DPS',
      },
    ])
    returnToCustodyDateController.saveValues(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith(
        sessionModelFields.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS,
        true,
      )
    // expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.CONFLICTING_ADJUSTMENTS, {
    //   exact: [],
    //   overlap: [
    //     {
    //       additionalDaysAwarded: null,
    //       adjustmentArithmeticType: 'ADDITION',
    //       adjustmentType: 'UNLAWFULLY_AT_LARGE',
    //       adjustmentTypeText: 'UAL (Unlawfully at large)',
    //       bookingId: 1154003,
    //       createdDate: '2018-10-26T14:34:57.916685',
    //       days: 207,
    //       effectiveDays: 207,
    //       fromDate: '2018-10-20',
    //       id: 'ebf9db45-5780-4788-aa39-7c443d3e1fb1',
    //       lastUpdatedBy: 'JALVARES_ADM',
    //       lastUpdatedDate: '2018-03-25T14:34:57.916685',
    //       lawfullyAtLarge: null,
    //       person: 'G5437UX',
    //       prisonId: 'HMI',
    //       prisonName: 'Humber (HMP)',
    //       recallId: null,
    //       remand: null,
    //       sentenceSequence: null,
    //       source: 'DPS',
    //       specialRemission: null,
    //       status: 'ACTIVE',
    //       taggedBail: null,
    //       timeSpentAsAnAppealApplicant: null,
    //       timeSpentInCustodyAbroad: null,
    //       toDate: '2018-10-23',
    //       unlawfullyAtLarge: {
    //         type: 'RECALL',
    //       },
    //     },
    //     {
    //       additionalDaysAwarded: null,
    //       adjustmentArithmeticType: 'ADDITION',
    //       adjustmentType: 'UNLAWFULLY_AT_LARGE',
    //       adjustmentTypeText: 'UAL (Unlawfully at large)',
    //       bookingId: 1154003,
    //       createdDate: '2025-03-24T13:46:49.698849',
    //       days: 4,
    //       effectiveDays: 4,
    //       fromDate: '2018-10-20',
    //       id: '6fa8c572-160d-414e-b7ba-5c3f1a868e41',
    //       lastUpdatedBy: 'DBENTON',
    //       lastUpdatedDate: '2025-03-24T13:46:49.698849',
    //       lawfullyAtLarge: null,
    //       person: 'G5437UX',
    //       prisonId: 'HMI',
    //       prisonName: 'Humber (HMP)',
    //       recallId: null,
    //       remand: null,
    //       sentenceSequence: null,
    //       source: 'DPS',
    //       specialRemission: null,
    //       status: 'ACTIVE',
    //       taggedBail: null,
    //       timeSpentAsAnAppealApplicant: null,
    //       timeSpentInCustodyAbroad: null,
    //       toDate: '2018-10-23',
    //       unlawfullyAtLarge: {
    //         type: 'RECALL',
    //       },
    //     },
    //   ],
    //   within: [
    //     {
    //       additionalDaysAwarded: null,
    //       adjustmentArithmeticType: 'ADDITION',
    //       adjustmentType: 'UNLAWFULLY_AT_LARGE',
    //       adjustmentTypeText: 'UAL (Unlawfully at large)',
    //       bookingId: 1154003,
    //       createdDate: '2018-10-26T14:34:57.916685',
    //       days: 207,
    //       effectiveDays: 207,
    //       fromDate: '2018-10-20',
    //       id: 'ebf9db45-5780-4788-aa39-7c443d3e1fb1',
    //       lastUpdatedBy: 'JALVARES_ADM',
    //       lastUpdatedDate: '2018-03-25T14:34:57.916685',
    //       lawfullyAtLarge: null,
    //       person: 'G5437UX',
    //       prisonId: 'HMI',
    //       prisonName: 'Humber (HMP)',
    //       recallId: null,
    //       remand: null,
    //       sentenceSequence: null,
    //       source: 'DPS',
    //       specialRemission: null,
    //       status: 'ACTIVE',
    //       taggedBail: null,
    //       timeSpentAsAnAppealApplicant: null,
    //       timeSpentInCustodyAbroad: null,
    //       toDate: '2018-10-23',
    //       unlawfullyAtLarge: {
    //         type: 'RECALL',
    //       },
    //     },
    //     {
    //       additionalDaysAwarded: null,
    //       adjustmentArithmeticType: 'ADDITION',
    //       adjustmentType: 'UNLAWFULLY_AT_LARGE',
    //       adjustmentTypeText: 'UAL (Unlawfully at large)',
    //       bookingId: 1154003,
    //       createdDate: '2025-03-24T13:46:49.698849',
    //       days: 4,
    //       effectiveDays: 4,
    //       fromDate: '2018-10-20',
    //       id: '6fa8c572-160d-414e-b7ba-5c3f1a868e41',
    //       lastUpdatedBy: 'DBENTON',
    //       lastUpdatedDate: '2025-03-24T13:46:49.698849',
    //       lawfullyAtLarge: null,
    //       person: 'G5437UX',
    //       prisonId: 'HMI',
    //       prisonName: 'Humber (HMP)',
    //       recallId: null,
    //       remand: null,
    //       sentenceSequence: null,
    //       source: 'DPS',
    //       specialRemission: null,
    //       status: 'ACTIVE',
    //       taggedBail: null,
    //       timeSpentAsAnAppealApplicant: null,
    //       timeSpentInCustodyAbroad: null,
    //       toDate: '2018-10-23',
    //       unlawfullyAtLarge: {
    //         type: 'RECALL',
    //       },
    //     },
    //   ],
    // })

    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL, true)
    expect(next).toHaveBeenCalled()
  })

  it('should show 4 conflicting adjustments on interrupt page (3UAL + 1LAL) as they are between April 2018 and Apirl 2019', () => {
    const mockUal = { firstDay: '2018-04-02', lastDay: '2019-04-18' }
    const mockPrisonerDetails = { bookingId: 'B1234', nomisId: 'A1234BC' }
    // @ts-expect-error
    getJourneyDataFromRequest.mockReturnValue({
      revocationDate: '2018-10-02',
    })
    // @ts-expect-error
    calculateUal.mockReturnValue(mockUal)
    // @ts-expect-error
    getPrisoner.mockReturnValue(mockPrisonerDetails)
    // @ts-expect-error
    getRevocationDate.mockReturnValue('2018-10-02')
    // @ts-expect-error
    getExistingAdjustments.mockReturnValue([
      {
        id: 'bd9c5c4e-b457-4dff-8fbc-799e87385262',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-11-01',
        fromDate: '2018-10-24',
        days: 9,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'RECALL' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: '1a7940ba-c127-4037-be10-625d9408a749',
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'DBENTON',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-24T13:46:50.170667',
        createdDate: '2025-03-24T10:49:56.527681',
        effectiveDays: 9,
        source: 'DPS',
      },
      {
        id: '6fa8c572-160d-414e-b7ba-5c3f1a868e41',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-10-23',
        fromDate: '2018-10-20',
        days: 4,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'SENTENCED_IN_ABSENCE' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'DBENTON',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-24T13:46:49.698849',
        createdDate: '2025-04-01T11:31:45.71777',
        effectiveDays: 4,
        source: 'DPS',
      },
      {
        id: 'ba8301b3-2590-4ad2-9b2c-d48df2dadd73',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-10-26',
        fromDate: '2018-10-25',
        days: 2,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'RECALL' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'DBENTON',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-03-24T13:52:17.394095',
        createdDate: '2025-03-24T13:52:17.394095',
        effectiveDays: 2,
        source: 'DPS',
      },
      {
        id: 'e60f01cb-584d-48a7-bb44-3b720707fd54',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'LAWFULLY_AT_LARGE',
        toDate: '2018-11-19',
        fromDate: '2018-11-11',
        days: 9,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: null,
        lawfullyAtLarge: { affectsDates: 'YES' },
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'Lawfully at large',
        adjustmentArithmeticType: 'NONE',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-04-01T14:04:27.322113',
        createdDate: '2025-03-31T14:02:10.40516',
        effectiveDays: 9,
        source: 'DPS',
      },
    ])

    returnToCustodyDateController.saveValues(req, res, next)

    expect(req.sessionModel.set).toHaveBeenCalledWith(
      sessionModelFields.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS,
      true,
    )
    expect(next).toHaveBeenCalled()
  })

  it('should show 2 conflicting adjustments of type UAL immigration detention and multiple overlapping UAL Recall adjustments line', () => {
    const mockUal = { firstDay: '2018-03-22', lastDay: '2018-03-30' }
    const mockPrisonerDetails = { bookingId: 'B1234', nomisId: 'A1234BC' }
    // @ts-expect-error
    getJourneyDataFromRequest.mockReturnValue({
      revocationDate: '2018-11-30',
    })
    // @ts-expect-error
    calculateUal.mockReturnValue(mockUal)
    // @ts-expect-error
    getPrisoner.mockReturnValue(mockPrisonerDetails)
    // @ts-expect-error
    getRevocationDate.mockReturnValue('2018-10-02')
    // @ts-expect-error
    getExistingAdjustments.mockReturnValue([
      {
        id: 'a3e751e6-c926-49b7-a156-3fa83c88aa6f',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-03-29',
        fromDate: '2018-03-28',
        days: 2,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'IMMIGRATION_DETENTION' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-04-01T14:02:18.884464',
        createdDate: '2025-03-17T16:57:30.375104',
        effectiveDays: 2,
        source: 'DPS',
      },
      {
        id: '6dd9c390-5f64-41f7-8380-0528a4bff1a5',
        bookingId: 1154003,
        person: 'G5437UX',
        adjustmentType: 'UNLAWFULLY_AT_LARGE',
        toDate: '2018-03-27',
        fromDate: '2018-03-23',
        days: 5,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: 'IMMIGRATION_DETENTION' },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: 'UAL (Unlawfully at large)',
        adjustmentArithmeticType: 'ADDITION',
        prisonName: 'Humber (HMP)',
        prisonId: 'HMI',
        lastUpdatedBy: 'JALVARES_ADM',
        status: 'ACTIVE',
        lastUpdatedDate: '2025-04-07T11:03:32.120909',
        createdDate: '2025-03-17T17:01:37.591945',
        effectiveDays: 5,
        source: 'DPS',
      },
    ])
    returnToCustodyDateController.saveValues(req, res, next)

    expect(req.sessionModel.set).toHaveBeenCalledWith(
      sessionModelFields.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS,
      true,
    )
    // expect(req.sessionModel.set).toHaveBeenCalledWith(
    //     sessionModelFields.CONFLICTING_ADJUSTMENTS,
    //     { exact: [], overlap: [], within: [] }
    //   );
    expect(next).toHaveBeenCalled()
  })
})
