import ReturnToCustodyDateController from './returnToCustodyDateController'
import {jest} from '@jest/globals'
import {calculateUal} from "../../utils/utils";
import getJourneyDataFromRequest, {sessionModelFields,getRevocationDate, getPrisoner, getExistingAdjustments} from "../../helpers/formWizardHelper";

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
  }
  })
)

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
        }
        res = {
            locals: {
                nomisId: 'A1234BC',
            },
        }
        next = jest.fn()
        returnToCustodyDateController = new ReturnToCustodyDateController({route: '/rtc-date'})

    })

    //Absolute happy path
    //No conflicting adjustments returned for booking
    it('should handle UAL calculation and save relevant session data when out of prison at recall', () => {
      const mockUal = {firstDay: '2023-10-01', lastDay: '2023-10-31'}
      // @ts-ignore
      const mockConflictingAdjustments = {exact: [], overlap: [], within: []}
      const mockPrisonerDetails = {bookingId: 'B1234', nomisId: 'A1234BC'}

      //@ts-ignore
      getJourneyDataFromRequest.mockReturnValue({
        revocationDate: '2023-09-30',
              })
      calculateUal.mockReturnValue(mockUal)
      getPrisoner.mockReturnValue(mockPrisonerDetails)
      getRevocationDate.mockReturnValue('2023-09-30')
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

  //4 conflicting adjustments in allConflicting array of object
  it('four conflicting adjustments UAL adjusted', () => {
    const mockUal = {firstDay: '2018-10-02', lastDay: '2018-10-31'}
    // @ts-ignore
    const mockConflictingAdjustments = {exact: [], overlap: [], within: []}
    const mockPrisonerDetails = {bookingId: 'B1234', nomisId: 'A1234BC'}

    getJourneyDataFromRequest.mockReturnValue({
      revocationDate: '2018-10-02',
    })
    calculateUal.mockReturnValue(mockUal)
    getPrisoner.mockReturnValue(mockPrisonerDetails)
    getRevocationDate.mockReturnValue('2018-10-02')
    getExistingAdjustments.mockReturnValue([
      {
        id: "ebf9db45-5780-4788-aa39-7c443d3e1fb1",
        bookingId: 1154003,
        person: "G5437UX",
        adjustmentType: "UNLAWFULLY_AT_LARGE",
        toDate: "2018-10-19",
        fromDate: "2018-03-27",
        days: 207,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: "RECALL" },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: "UAL (Unlawfully at large)",
        adjustmentArithmeticType: "ADDITION",
        prisonName: "Humber (HMP)",
        prisonId: "HMI",
        lastUpdatedBy: "JALVARES_ADM",
        status: "ACTIVE",
        lastUpdatedDate: "2025-03-18T14:34:57.916685",
        createdDate: "2025-03-18T14:34:57.916685",
        effectiveDays: 207,
        source: "DPS"
      },
      {
        id: "bd9c5c4e-b457-4dff-8fbc-799e87385262",
        bookingId: 1154003,
        person: "G5437UX",
        adjustmentType: "UNLAWFULLY_AT_LARGE",
        toDate: "2020-10-22",
        fromDate: "2018-10-24",
        days: 730,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: "RECALL" },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: "1a7940ba-c127-4037-be10-625d9408a749",
        adjustmentTypeText: "UAL (Unlawfully at large)",
        adjustmentArithmeticType: "ADDITION",
        prisonName: "Humber (HMP)",
        prisonId: "HMI",
        lastUpdatedBy: "DBENTON",
        status: "ACTIVE",
        lastUpdatedDate: "2025-03-24T13:46:50.170667",
        createdDate: "2025-03-24T10:49:56.527681",
        effectiveDays: 730,
        source: "DPS"
      },
      {
        id: "6fa8c572-160d-414e-b7ba-5c3f1a868e41",
        bookingId: 1154003,
        person: "G5437UX",
        adjustmentType: "UNLAWFULLY_AT_LARGE",
        toDate: "2018-10-23",
        fromDate: "2018-10-20",
        days: 4,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: "RECALL" },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: "UAL (Unlawfully at large)",
        adjustmentArithmeticType: "ADDITION",
        prisonName: "Humber (HMP)",
        prisonId: "HMI",
        lastUpdatedBy: "DBENTON",
        status: "ACTIVE",
        lastUpdatedDate: "2025-03-24T13:46:49.698849",
        createdDate: "2025-03-24T13:46:49.698849",
        effectiveDays: 4,
        source: "DPS"
      },
      {
        id: "ba8301b3-2590-4ad2-9b2c-d48df2dadd73",
        bookingId: 1154003,
        person: "G5437UX",
        adjustmentType: "UNLAWFULLY_AT_LARGE",
        toDate: "2018-10-26",
        fromDate: "2018-10-25",
        days: 2,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: "RECALL" },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: "UAL (Unlawfully at large)",
        adjustmentArithmeticType: "ADDITION",
        prisonName: "Humber (HMP)",
        prisonId: "HMI",
        lastUpdatedBy: "DBENTON",
        status: "ACTIVE",
        lastUpdatedDate: "2025-03-24T13:52:17.394095",
        createdDate: "2025-03-24T13:52:17.394095",
        effectiveDays: 2,
        source: "DPS"
      },
      {
        id: "e60f01cb-584d-48a7-bb44-3b720707fd54",
        bookingId: 1154003,
        person: "G5437UX",
        adjustmentType: "LAWFULLY_AT_LARGE",
        toDate: "2022-03-27",
        fromDate: "2022-03-27",
        days: 1,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: null,
        lawfullyAtLarge: { affectsDates: "YES" },
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: "Lawfully at large",
        adjustmentArithmeticType: "NONE",
        prisonName: "Humber (HMP)",
        prisonId: "HMI",
        lastUpdatedBy: "JALVARES_ADM",
        status: "ACTIVE",
        lastUpdatedDate: "2025-03-31T14:02:10.40516",
        createdDate: "2025-03-31T14:02:10.40516",
        effectiveDays: 1,
        source: "DPS"
      },
      {
        id: "a3e751e6-c926-49b7-a156-3fa83c88aa6f",
        bookingId: 1154003,
        person: "G5437UX",
        adjustmentType: "UNLAWFULLY_AT_LARGE",
        toDate: "2018-03-29",
        fromDate: "2018-03-28",
        days: 2,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: "RECALL" },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: "UAL (Unlawfully at large)",
        adjustmentArithmeticType: "ADDITION",
        prisonName: "Humber (HMP)",
        prisonId: "HMI",
        lastUpdatedBy: "JALVARES_ADM",
        status: "ACTIVE",
        lastUpdatedDate: "2025-03-17T16:59:44.50797",
        createdDate: "2025-03-17T16:57:30.375104",
        effectiveDays: 2,
        source: "NOMIS"
      },
      {
        id: "6dd9c390-5f64-41f7-8380-0528a4bff1a5",
        bookingId: 1154003,
        person: "G5437UX",
        adjustmentType: "UNLAWFULLY_AT_LARGE",
        toDate: "2018-03-27",
        fromDate: "2018-03-23",
        days: 5,
        remand: null,
        additionalDaysAwarded: null,
        unlawfullyAtLarge: { type: "RECALL" },
        lawfullyAtLarge: null,
        specialRemission: null,
        taggedBail: null,
        timeSpentInCustodyAbroad: null,
        timeSpentAsAnAppealApplicant: null,
        sentenceSequence: null,
        recallId: null,
        adjustmentTypeText: "UAL (Unlawfully at large)",
        adjustmentArithmeticType: "ADDITION",
        prisonName: "Humber (HMP)",
        prisonId: "HMI",
        lastUpdatedBy: "NOMIS",
        status: "ACTIVE",
        lastUpdatedDate: "2025-03-17T17:01:38.24799",
        createdDate: "2025-03-17T17:01:37.591945",
        effectiveDays: 5,
        source: "NOMIS"
      }
    ])

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
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.UAL_TO_EDIT)
    expect(next).toHaveBeenCalled()
  })

  // this is where it doesnt work well in the code, you input two dates in april 2018
  // and because there are adjustments in ove and nov in 2018 and it says they are
  // overlapping when they should not be, it should not show interrupt page but happy path
  it.only('should show NO conflicting but shows the 2 in the mock', () => {
    const mockUal = {firstDay: '2018-04-04', lastDay: '2018-04-06'}
    // @ts-ignore
    const mockConflictingAdjustments = {exact: [], overlap: [], within: []}
    const mockPrisonerDetails = {bookingId: 'B1234', nomisId: 'A1234BC'}

    getJourneyDataFromRequest.mockReturnValue({
      revocationDate: '2018-04-04',
    })
    calculateUal.mockReturnValue(mockUal)
    getPrisoner.mockReturnValue(mockPrisonerDetails)
    getRevocationDate.mockReturnValue('2018-10-02')
    getExistingAdjustments.mockReturnValue([
        {
            id: "ebf9db45-5780-4788-aa39-7c443d3e1fb1",
            bookingId: 1154003,
            person: "G5437UX",
            adjustmentType: "UNLAWFULLY_AT_LARGE",
            toDate: "2018-10-23",
            fromDate: "2018-10-20",
            days: 207,
            remand: null,
            additionalDaysAwarded: null,
            unlawfullyAtLarge: { type: "SENTENCE_IN_ABSENCE" },
            lawfullyAtLarge: null,
            specialRemission: null,
            taggedBail: null,
            timeSpentInCustodyAbroad: null,
            timeSpentAsAnAppealApplicant: null,
            sentenceSequence: null,
            recallId: null,
            adjustmentTypeText: "UAL (Unlawfully at large)",
            adjustmentArithmeticType: "ADDITION",
            prisonName: "Humber (HMP)",
            prisonId: "HMI",
            lastUpdatedBy: "JALVARES_ADM",
            status: "ACTIVE",
            lastUpdatedDate: "2025-03-18T14:34:57.916685",
            createdDate: "2025-03-18T14:34:57.916685",
            effectiveDays: 207,
            source: "DPS"
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
            source: 'DPS'  
        }
    ])

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
    expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.UAL_TO_EDIT)
    expect(next).toHaveBeenCalled()
  })

//   it('', () => {
//     const mockUal = {firstDay: '2018-10-02', lastDay: '2018-10-31'}
//     // @ts-ignore
//     const mockConflictingAdjustments = {exact: [], overlap: [], within: []}
//     const mockPrisonerDetails = {bookingId: 'B1234', nomisId: 'A1234BC'}

//     getJourneyDataFromRequest.mockReturnValue({
//       revocationDate: '2018-10-02',
//     })
//     calculateUal.mockReturnValue(mockUal)
//     getPrisoner.mockReturnValue(mockPrisonerDetails)
//     getRevocationDate.mockReturnValue('2018-10-02')
//     getExistingAdjustments.mockReturnValue([
//       {
//         id: "ebf9db45-5780-4788-aa39-7c443d3e1fb1",
//         bookingId: 1154003,
//         person: "G5437UX",
//         adjustmentType: "UNLAWFULLY_AT_LARGE",
//         toDate: "2018-10-19",
//         fromDate: "2018-03-27",
//         days: 207,
//         remand: null,
//         additionalDaysAwarded: null,
//         unlawfullyAtLarge: { type: "RECALL" },
//         lawfullyAtLarge: null,
//         specialRemission: null,
//         taggedBail: null,
//         timeSpentInCustodyAbroad: null,
//         timeSpentAsAnAppealApplicant: null,
//         sentenceSequence: null,
//         recallId: null,
//         adjustmentTypeText: "UAL (Unlawfully at large)",
//         adjustmentArithmeticType: "ADDITION",
//         prisonName: "Humber (HMP)",
//         prisonId: "HMI",
//         lastUpdatedBy: "JALVARES_ADM",
//         status: "ACTIVE",
//         lastUpdatedDate: "2025-03-18T14:34:57.916685",
//         createdDate: "2025-03-18T14:34:57.916685",
//         effectiveDays: 207,
//         source: "DPS"
//       },
//       {
//         id: "bd9c5c4e-b457-4dff-8fbc-799e87385262",
//         bookingId: 1154003,
//         person: "G5437UX",
//         adjustmentType: "UNLAWFULLY_AT_LARGE",
//         toDate: "2020-10-22",
//         fromDate: "2018-10-24",
//         days: 730,
//         remand: null,
//         additionalDaysAwarded: null,
//         unlawfullyAtLarge: { type: "RECALL" },
//         lawfullyAtLarge: null,
//         specialRemission: null,
//         taggedBail: null,
//         timeSpentInCustodyAbroad: null,
//         timeSpentAsAnAppealApplicant: null,
//         sentenceSequence: null,
//         recallId: "1a7940ba-c127-4037-be10-625d9408a749",
//         adjustmentTypeText: "UAL (Unlawfully at large)",
//         adjustmentArithmeticType: "ADDITION",
//         prisonName: "Humber (HMP)",
//         prisonId: "HMI",
//         lastUpdatedBy: "DBENTON",
//         status: "ACTIVE",
//         lastUpdatedDate: "2025-03-24T13:46:50.170667",
//         createdDate: "2025-03-24T10:49:56.527681",
//         effectiveDays: 730,
//         source: "DPS"
//       },
//       {
//         id: "6fa8c572-160d-414e-b7ba-5c3f1a868e41",
//         bookingId: 1154003,
//         person: "G5437UX",
//         adjustmentType: "UNLAWFULLY_AT_LARGE",
//         toDate: "2018-10-23",
//         fromDate: "2018-10-20",
//         days: 4,
//         remand: null,
//         additionalDaysAwarded: null,
//         unlawfullyAtLarge: { type: "RECALL" },
//         lawfullyAtLarge: null,
//         specialRemission: null,
//         taggedBail: null,
//         timeSpentInCustodyAbroad: null,
//         timeSpentAsAnAppealApplicant: null,
//         sentenceSequence: null,
//         recallId: null,
//         adjustmentTypeText: "UAL (Unlawfully at large)",
//         adjustmentArithmeticType: "ADDITION",
//         prisonName: "Humber (HMP)",
//         prisonId: "HMI",
//         lastUpdatedBy: "DBENTON",
//         status: "ACTIVE",
//         lastUpdatedDate: "2025-03-24T13:46:49.698849",
//         createdDate: "2025-03-24T13:46:49.698849",
//         effectiveDays: 4,
//         source: "DPS"
//       },
//       {
//         id: "ba8301b3-2590-4ad2-9b2c-d48df2dadd73",
//         bookingId: 1154003,
//         person: "G5437UX",
//         adjustmentType: "UNLAWFULLY_AT_LARGE",
//         toDate: "2018-10-26",
//         fromDate: "2018-10-25",
//         days: 2,
//         remand: null,
//         additionalDaysAwarded: null,
//         unlawfullyAtLarge: { type: "RECALL" },
//         lawfullyAtLarge: null,
//         specialRemission: null,
//         taggedBail: null,
//         timeSpentInCustodyAbroad: null,
//         timeSpentAsAnAppealApplicant: null,
//         sentenceSequence: null,
//         recallId: null,
//         adjustmentTypeText: "UAL (Unlawfully at large)",
//         adjustmentArithmeticType: "ADDITION",
//         prisonName: "Humber (HMP)",
//         prisonId: "HMI",
//         lastUpdatedBy: "DBENTON",
//         status: "ACTIVE",
//         lastUpdatedDate: "2025-03-24T13:52:17.394095",
//         createdDate: "2025-03-24T13:52:17.394095",
//         effectiveDays: 2,
//         source: "DPS"
//       },
//       {
//         id: "e60f01cb-584d-48a7-bb44-3b720707fd54",
//         bookingId: 1154003,
//         person: "G5437UX",
//         adjustmentType: "LAWFULLY_AT_LARGE",
//         toDate: "2022-03-27",
//         fromDate: "2022-03-27",
//         days: 1,
//         remand: null,
//         additionalDaysAwarded: null,
//         unlawfullyAtLarge: null,
//         lawfullyAtLarge: { affectsDates: "YES" },
//         specialRemission: null,
//         taggedBail: null,
//         timeSpentInCustodyAbroad: null,
//         timeSpentAsAnAppealApplicant: null,
//         sentenceSequence: null,
//         recallId: null,
//         adjustmentTypeText: "Lawfully at large",
//         adjustmentArithmeticType: "NONE",
//         prisonName: "Humber (HMP)",
//         prisonId: "HMI",
//         lastUpdatedBy: "JALVARES_ADM",
//         status: "ACTIVE",
//         lastUpdatedDate: "2025-03-31T14:02:10.40516",
//         createdDate: "2025-03-31T14:02:10.40516",
//         effectiveDays: 1,
//         source: "DPS"
//       },
//       {
//         id: "a3e751e6-c926-49b7-a156-3fa83c88aa6f",
//         bookingId: 1154003,
//         person: "G5437UX",
//         adjustmentType: "UNLAWFULLY_AT_LARGE",
//         toDate: "2018-03-29",
//         fromDate: "2018-03-28",
//         days: 2,
//         remand: null,
//         additionalDaysAwarded: null,
//         unlawfullyAtLarge: { type: "RECALL" },
//         lawfullyAtLarge: null,
//         specialRemission: null,
//         taggedBail: null,
//         timeSpentInCustodyAbroad: null,
//         timeSpentAsAnAppealApplicant: null,
//         sentenceSequence: null,
//         recallId: null,
//         adjustmentTypeText: "UAL (Unlawfully at large)",
//         adjustmentArithmeticType: "ADDITION",
//         prisonName: "Humber (HMP)",
//         prisonId: "HMI",
//         lastUpdatedBy: "JALVARES_ADM",
//         status: "ACTIVE",
//         lastUpdatedDate: "2025-03-17T16:59:44.50797",
//         createdDate: "2025-03-17T16:57:30.375104",
//         effectiveDays: 2,
//         source: "NOMIS"
//       },
//       {
//         id: "6dd9c390-5f64-41f7-8380-0528a4bff1a5",
//         bookingId: 1154003,
//         person: "G5437UX",
//         adjustmentType: "UNLAWFULLY_AT_LARGE",
//         toDate: "2018-03-27",
//         fromDate: "2018-03-23",
//         days: 5,
//         remand: null,
//         additionalDaysAwarded: null,
//         unlawfullyAtLarge: { type: "RECALL" },
//         lawfullyAtLarge: null,
//         specialRemission: null,
//         taggedBail: null,
//         timeSpentInCustodyAbroad: null,
//         timeSpentAsAnAppealApplicant: null,
//         sentenceSequence: null,
//         recallId: null,
//         adjustmentTypeText: "UAL (Unlawfully at large)",
//         adjustmentArithmeticType: "ADDITION",
//         prisonName: "Humber (HMP)",
//         prisonId: "HMI",
//         lastUpdatedBy: "NOMIS",
//         status: "ACTIVE",
//         lastUpdatedDate: "2025-03-17T17:01:38.24799",
//         createdDate: "2025-03-17T17:01:37.591945",
//         effectiveDays: 5,
//         source: "NOMIS"
//       }
//     ])

//     returnToCustodyDateController.saveValues(req, res, next)

//     expect(req.sessionModel.set).toHaveBeenCalledWith(
//       sessionModelFields.UAL_TO_CREATE,
//       expect.objectContaining({
//         firstDay: mockUal.firstDay,
//         lastDay: mockUal.lastDay,
//         nomisId: mockPrisonerDetails.nomisId,
//         bookingId: mockPrisonerDetails.bookingId,
//       }),
//     )
//     expect(req.sessionModel.set).toHaveBeenCalledWith(sessionModelFields.UAL_TO_EDIT)
//     expect(next).toHaveBeenCalled()
//   })

//     it('should unset UAL and UAL_TO_CREATE if no UAL is calculated', () => {
//         // @ts-ignore
//       jest.spyOn(global, 'calculateUal').mockReturnValue(null)

//         returnToCustodyDateController.saveValues(req, res, next)

//         expect(req.sessionModel.unset).toHaveBeenCalledWith('UAL')
//         expect(req.sessionModel.unset).toHaveBeenCalledWith('UAL_TO_CREATE')
//         expect(next).toHaveBeenCalled()
//     })

//     it('should set returnToCustodyDate to null if inPrisonAtRecall is true', () => {
//         req.form.values.inPrisonAtRecall = 'true'

//         returnToCustodyDateController.saveValues(req, res, next)

//         expect(req.form.values.returnToCustodyDate).toBe(null)
//         expect(next).toHaveBeenCalled()
//     })

//     it('should handle conflicting adjustments and set relevant session data', () => {
//         const mockUal = {firstDay: '2023-10-01', lastDay: '2023-10-31'}
//         const relevantAdjustment = {
//             id: '1',
//             bookingId: 'B1234',
//             fromDate: '2023-09-01',
//             toDate: '2023-09-15',
//             person: 'A1234BC',
//             adjustmentType: 'LAWFULLY_AT_LARGE',
//         }
//         const mockConflictingAdjustments = {exact: [], overlap: [], within: [relevantAdjustment]}

//         jest.spyOn(global, 'calculateUal').mockReturnValue(mockUal)
//         jest.spyOn(global, 'getRevocationDate').mockReturnValue('2023-09-30')
//         jest.spyOn(global, 'getExistingAdjustments').mockReturnValue([])
//         jest
//             .spyOn(returnToCustodyDateController, 'identifyConflictingAdjustments')
//             .mockReturnValue(mockConflictingAdjustments)
//         jest
//             .spyOn(returnToCustodyDateController, 'isRelevantAdjustment')
//             .mockReturnValue({isRelevant: true, type: 'LAWFULLY_AT_LARGE'})

//         returnToCustodyDateController.saveValues(req, res, next)

//         expect(req.sessionModel.set).toHaveBeenCalledWith(
//             'RELEVANT_ADJUSTMENT',
//             expect.objectContaining(relevantAdjustment),
//         )
//         expect(req.sessionModel.set).toHaveBeenCalledWith(
//             'INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS',
//             true,
//         )
//         expect(next).toHaveBeenCalled()
//     })
})
