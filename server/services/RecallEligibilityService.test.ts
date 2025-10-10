import { jest } from '@jest/globals'
import { addDays } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { CourtCase, Recall } from 'models'
import { RecallEligibilityService } from './RecallEligibilityService'

import { AdjustmentDto } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import { ValidationMessage, CalculationBreakdown } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { RecallableCourtCaseSentence } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

// Type definition for recall journey data
interface RecallJourneyData {
  isEdit?: boolean
  storedRecall?: {
    recallId?: string
    createdAt?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }
  revocationDate?: Date | string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

jest.mock('../../logger')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceAsAny = any

describe('RecallEligibilityService', () => {
  let service: RecallEligibilityService
  let privateService: ServiceAsAny
  const revocationDate = new Date('2023-06-01')

  const mockSdsSentence: RecallableCourtCaseSentence = {
    sentenceUuid: 'sent1',
    sentenceTypeUuid: 'test-sentence-type-uuid-1',
    offenceCode: 'OFF001',
    offenceStartDate: '2023-01-01',
    offenceEndDate: '2023-01-02',
    outcome: 'Guilty',
    sentenceType: 'Standard Determinate Sentence',
    classification: 'STANDARD',
    systemOfRecord: 'NOMIS',
    periodLengths: [],
    convictionDate: '2023-01-01',
    countNumber: '1',
    lineNumber: '1',
    sentenceServeType: 'CONCURRENT',
    outcomeDescription: 'Guilty verdict',
    isRecallable: true,
  }

  const mockNonSdsSentence: RecallableCourtCaseSentence = {
    sentenceUuid: 'sent2',
    sentenceTypeUuid: 'test-sentence-type-uuid-2',
    offenceCode: 'OFF002',
    offenceStartDate: '2023-01-01',
    offenceEndDate: '2023-01-02',
    outcome: 'Guilty',
    sentenceType: 'Extended Determinate Sentence',
    classification: 'EXTENDED',
    systemOfRecord: 'NOMIS',
    periodLengths: [],
    convictionDate: '2023-01-01',
    countNumber: '1',
    lineNumber: '1',
    sentenceServeType: 'CONCURRENT',
    outcomeDescription: 'Guilty verdict',
    isRecallable: true,
  }

  const mockShortSentence: RecallableCourtCaseSentence = {
    sentenceUuid: 'sent3',
    sentenceTypeUuid: 'test-sentence-type-uuid-3',
    offenceCode: 'OFF003',
    offenceStartDate: '2023-01-01',
    offenceEndDate: '2023-01-02',
    outcome: 'Guilty',
    sentenceType: 'Standard Determinate Sentence',
    classification: 'STANDARD',
    systemOfRecord: 'NOMIS',
    periodLengths: [],
    convictionDate: '2023-01-01',
    countNumber: '1',
    lineNumber: '1',
    sentenceServeType: 'CONCURRENT',
    outcomeDescription: 'Guilty verdict',
    isRecallable: true,
  }

  const mockCourtCase: CourtCase = {
    caseId: 'case1',
    reference: 'REF001',
    locationName: 'Test Court',
    location: 'TC',
    date: '2023-01-01',
    status: 'ACTIVE',
    sentenced: true,
    sentences: [mockSdsSentence],
  }

  const mockAdjustment: AdjustmentDto = {
    id: 'adj1',
    bookingId: 123456,
    person: 'A1234BC',
    adjustmentType: 'UNLAWFULLY_AT_LARGE',
    fromDate: '2023-05-01',
    toDate: '2023-05-31',
    days: 30,
  }

  const mockRecall: Recall = {
    recallId: 'recall1',
    createdAt: '2023-04-01T10:00:00Z',
    created_by_username: 'DPS',
    revocationDate: new Date('2023-04-01'),
    returnToCustodyDate: new Date('2023-04-02'),
    recallType: {
      code: 'STANDARD',
      description: 'Standard Recall',
      fixedTerm: false,
    },
    location: 'TEST',
    locationName: 'Test Location',
    sentenceIds: ['sent1'],
    courtCaseIds: ['case1'],
    source: 'DPS',
  }

  const mockFtrRecall: Recall = {
    recallId: 'recall2',
    createdAt: '2023-04-01T10:00:00Z',
    created_by_username: 'DPS',
    revocationDate: new Date('2023-04-01'),
    returnToCustodyDate: new Date('2023-04-02'),
    recallType: {
      code: 'FTR_14',
      description: 'Fourteen Day Fixed Term Recall',
      fixedTerm: true,
    },
    location: 'TEST',
    locationName: 'Test Location',
    sentenceIds: ['sent2'],
    courtCaseIds: ['case1'],
    source: 'DPS',
  }

  const mockCalculationBreakdown: CalculationBreakdown = {
    concurrentSentences: [],
    consecutiveSentence: undefined,
    otherDates: {},
    breakdownByReleaseDateType: {},
    ersedNotApplicableDueToDtoLaterThanCrd: false,
    showSds40Hints: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    service = new RecallEligibilityService()
    privateService = service as ServiceAsAny
  })

  describe('assessRecallEligibility', () => {
    it('should return normal routing for valid SDS sentences', async () => {
      const result = await service.assessRecallEligibility({
        courtCases: [mockCourtCase],
        adjustments: [],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [],
        revocationDate,
      })

      expect(result.isValid).toBe(true)
      expect(result.routing).toBe('NORMAL')
      expect(result.eligibilityDetails.eligibleSentenceCount).toBe(1)
      expect(result.eligibilityDetails.hasNonSdsSentences).toBe(false)
    })

    it('should return no sentences for recall when only non-SDS sentences present', async () => {
      const nonSdsCase: CourtCase = {
        ...mockCourtCase,
        sentences: [mockNonSdsSentence],
      }

      const result = await service.assessRecallEligibility({
        courtCases: [nonSdsCase],
        adjustments: [],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [],
        revocationDate,
      })

      expect(result.isValid).toBe(true)
      expect(result.routing).toBe('NO_SENTENCES_FOR_RECALL')
      expect(result.eligibilityDetails.hasNonSdsSentences).toBe(true)
      expect(result.eligibilityDetails.eligibleSentenceCount).toBe(0)
    })

    it('should return manual review for mixed SDS and non-SDS sentences', async () => {
      const mixedCase: CourtCase = {
        ...mockCourtCase,
        sentences: [mockSdsSentence, mockNonSdsSentence],
      }

      const result = await service.assessRecallEligibility({
        courtCases: [mixedCase],
        adjustments: [],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [],
        revocationDate,
      })

      expect(result.isValid).toBe(true)
      expect(result.routing).toBe('MANUAL_REVIEW_REQUIRED')
      expect(result.eligibilityDetails.hasNonSdsSentences).toBe(true)
      expect(result.eligibilityDetails.eligibleSentenceCount).toBe(1) // Only SDS sentence is eligible after filtering
    })

    it('should return conflicting adjustments for invalid revocation date', async () => {
      const conflictingAdjustment: AdjustmentDto = {
        ...mockAdjustment,
        fromDate: '2023-05-01',
        toDate: '2023-06-15', // Overlaps with revocation date
      }

      const result = await service.assessRecallEligibility({
        courtCases: [mockCourtCase],
        adjustments: [conflictingAdjustment],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [],
        revocationDate,
      })

      expect(result.isValid).toBe(false)
      expect(result.routing).toBe('CONFLICTING_ADJUSTMENTS')
      expect(result.validationMessages).toHaveLength(1)
      expect(result.validationMessages[0].code).toBe('ADJUSTMENT_FUTURE_DATED_UAL')
    })

    it('should return no sentences for recall when no eligible sentences', async () => {
      const emptyCase: CourtCase = {
        ...mockCourtCase,
        sentences: [],
      }

      const result = await service.assessRecallEligibility({
        courtCases: [emptyCase],
        adjustments: [],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [],
        revocationDate,
      })

      expect(result.isValid).toBe(true)
      expect(result.routing).toBe('NO_SENTENCES_FOR_RECALL')
      expect(result.eligibilityDetails.eligibleSentenceCount).toBe(0)
    })

    it('should handle critical validation messages', async () => {
      const criticalValidation: ValidationMessage = {
        code: 'ZERO_IMPRISONMENT_TERM',
        message: 'Critical validation error',
        arguments: [],
        type: 'VALIDATION',
      }

      const result = await service.assessRecallEligibility({
        courtCases: [mockCourtCase],
        adjustments: [],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [criticalValidation],
        revocationDate,
      })

      expect(result.isValid).toBe(true)
      expect(result.routing).toBe('NO_SENTENCES_FOR_RECALL')
    })

    it('should handle non-critical validation messages', async () => {
      const nonCriticalValidation: ValidationMessage = {
        code: 'ADJUSTMENT_FUTURE_DATED_UAL',
        message: 'Non-critical validation warning',
        arguments: [],
        type: 'VALIDATION',
      }

      const result = await service.assessRecallEligibility({
        courtCases: [mockCourtCase],
        adjustments: [],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [nonCriticalValidation],
        revocationDate,
      })

      expect(result.isValid).toBe(true)
      expect(result.routing).toBe('MANUAL_REVIEW_REQUIRED')
    })

    it('should calculate invalid recall types based on sentence length', async () => {
      const mixedCase: CourtCase = {
        ...mockCourtCase,
        sentences: [mockShortSentence, mockSdsSentence],
      }

      const result = await service.assessRecallEligibility({
        courtCases: [mixedCase],
        adjustments: [],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [],
        revocationDate,
      })

      expect(result.isValid).toBe(true)
      expect(result.eligibilityDetails.invalidRecallTypes.length).toBeGreaterThan(0) // Should have some invalid types based on sentence mix
    })

    it('should exclude adjustments for current recall in edit mode', async () => {
      const journeyData: RecallJourneyData = {
        isEdit: true,
        storedRecall: {
          recallId: 'recall1',
          createdAt: '2023-06-01T10:00:00Z',
          created_by_username: 'DPS',
          revocationDate: new Date('2023-06-01'),
          returnToCustodyDate: new Date('2023-06-02'),
          recallType: { code: 'LR', description: 'Standard Recall', fixedTerm: false },
          location: 'TEST',
          sentenceIds: ['sent1'],
          courtCaseIds: ['case1'],
          source: 'DPS',
        },
        revocationDate,
        inPrisonAtRecall: true,
        manualCaseSelection: false,
        recallType: { code: 'LR', description: 'Standard Recall', fixedTerm: false },
        courtCaseCount: 1,
        eligibleSentenceCount: 1,
      }

      const adjustmentLinkedToRecall: AdjustmentDto = {
        ...mockAdjustment,
        fromDate: '2023-05-01',
        toDate: '2023-06-15',
        recallId: 'recall1', // Link to the recall being edited
      }

      const result = await service.assessRecallEligibility({
        courtCases: [mockCourtCase],
        adjustments: [adjustmentLinkedToRecall],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [],
        revocationDate,
        journeyData,
      })

      expect(result.isValid).toBe(true)
      expect(result.routing).toBe('NORMAL')
      expect(result.validationMessages).toHaveLength(0)
    })

    it('should exclude recalls for current recall in edit mode', async () => {
      const journeyData: RecallJourneyData = {
        isEdit: true,
        storedRecall: {
          recallId: 'recall1',
          createdAt: '2023-06-01T10:00:00Z',
          created_by_username: 'DPS',
          revocationDate: new Date('2023-06-01'),
          returnToCustodyDate: new Date('2023-06-02'),
          recallType: { code: 'LR', description: 'Standard Recall', fixedTerm: false },
          location: 'TEST',
          sentenceIds: ['sent1'],
          courtCaseIds: ['case1'],
          source: 'DPS',
        },
        revocationDate,
        inPrisonAtRecall: true,
        manualCaseSelection: false,
        recallType: { code: 'LR', description: 'Standard Recall', fixedTerm: false },
        courtCaseCount: 1,
        eligibleSentenceCount: 1,
      }

      const conflictingRecall: Recall = {
        ...mockRecall,
        recallId: 'recall1',
        revocationDate: new Date('2023-06-15'), // Would conflict but should be excluded
      }

      const result = await service.assessRecallEligibility({
        courtCases: [mockCourtCase],
        adjustments: [],
        existingRecalls: [conflictingRecall],
        breakdown: mockCalculationBreakdown,
        validationMessages: [],
        revocationDate,
        journeyData,
      })

      expect(result.isValid).toBe(true)
      expect(result.routing).toBe('NORMAL')
      expect(result.validationMessages).toHaveLength(0)
    })
  })

  describe('validateRevocationDate', () => {
    it('should pass validation for valid revocation date', () => {
      const result = privateService.validateRevocationDate(revocationDate, [mockCourtCase], [], [])

      expect(result.isValid).toBe(true)
      expect(result.validationMessages).toHaveLength(0)
    })

    it('should fail validation for revocation date before sentence date', () => {
      const earlyRevocationDate = new Date('2022-12-01')

      const result = privateService.validateRevocationDate(earlyRevocationDate, [mockCourtCase], [], [])

      expect(result.isValid).toBe(false)
      expect(result.validationMessages).toHaveLength(1)
      expect(result.validationMessages[0].code).toBe('REMAND_ON_OR_AFTER_SENTENCE_DATE')
    })

    it('should fail validation for revocation date within adjustment period', () => {
      const adjustmentOverlap: AdjustmentDto = {
        ...mockAdjustment,
        fromDate: '2023-05-01',
        toDate: '2023-06-15',
      }

      const result = privateService.validateRevocationDate(revocationDate, [mockCourtCase], [adjustmentOverlap], [])

      expect(result.isValid).toBe(false)
      expect(result.validationMessages).toHaveLength(1)
      expect(result.validationMessages[0].code).toBe('ADJUSTMENT_FUTURE_DATED_UAL')
    })

    it('should fail validation for revocation date before existing recall', () => {
      const laterRecall: Recall = {
        ...mockRecall,
        revocationDate: new Date('2023-06-15'),
      }

      const result = privateService.validateRevocationDate(revocationDate, [mockCourtCase], [], [laterRecall])

      expect(result.isValid).toBe(false)
      expect(result.validationMessages).toHaveLength(1)
      expect(result.validationMessages[0].code).toBe('CONCURRENT_CONSECUTIVE_SENTENCES_DURATION')
    })

    it('should fail validation for revocation date overlapping with FTR period', () => {
      const overlappingFtrRecall: Recall = {
        ...mockFtrRecall,
        revocationDate: new Date('2023-05-20'), // 14 days would extend to June 3rd
      }

      const result = privateService.validateRevocationDate(revocationDate, [mockCourtCase], [], [overlappingFtrRecall])

      expect(result.isValid).toBe(false)
      expect(result.validationMessages).toHaveLength(1)
      expect(result.validationMessages[0].code).toBe('FTR_SENTENCES_CONFLICT_WITH_EACH_OTHER')
    })
  })

  describe('fixed-term recall eligibility', () => {
    describe('isFourteenDayRecallPossible', () => {
      it('should return true for sentences under 12 months', () => {
        const shortSentences = [
          {
            sentenceId: 'sent1',
            sentenceLengthDays: 180,
            unadjustedSled: addDays(new Date('2023-01-01'), 180),
          },
        ]

        const result = privateService.isFourteenDayRecallPossible(shortSentences, revocationDate)

        expect(result).toBe(true)
      })

      it('should return false for sentences over 12 months with SLED after 14 days', () => {
        const longSentences = [
          {
            sentenceId: 'sent1',
            sentenceLengthDays: 730,
            unadjustedSled: addDays(revocationDate, 20), // After 14 days
          },
        ]

        const result = privateService.isFourteenDayRecallPossible(longSentences, revocationDate)

        expect(result).toBe(false)
      })

      it('should return true for sentences over 12 months with SLED within 14 days', () => {
        const longSentences = [
          {
            sentenceId: 'sent1',
            sentenceLengthDays: 730,
            unadjustedSled: addDays(revocationDate, 10), // Within 14 days
          },
        ]

        const result = privateService.isFourteenDayRecallPossible(longSentences, revocationDate)

        expect(result).toBe(true)
      })

      it('should handle mixed sentence lengths', () => {
        const mixedSentences = [
          {
            sentenceId: 'sent1',
            sentenceLengthDays: 180, // Under 12 months
            unadjustedSled: addDays(new Date('2023-01-01'), 180),
          },
          {
            sentenceId: 'sent2',
            sentenceLengthDays: 730, // Over 12 months
            unadjustedSled: addDays(revocationDate, 10), // Within 14 days
          },
        ]

        const result = privateService.isFourteenDayRecallPossible(mixedSentences, revocationDate)

        expect(result).toBe(true)
      })
    })

    describe('isTwentyEightDayRecallPossible', () => {
      it('should return true for sentences over 12 months', () => {
        const longSentences = [
          {
            sentenceId: 'sent1',
            sentenceLengthDays: 730,
            unadjustedSled: addDays(revocationDate, 20),
          },
        ]

        const result = privateService.isTwentyEightDayRecallPossible(longSentences, revocationDate)

        expect(result).toBe(true)
      })

      it('should return false for sentences under 12 months', () => {
        const shortSentences = [
          {
            sentenceId: 'sent1',
            sentenceLengthDays: 180,
            unadjustedSled: addDays(new Date('2023-01-01'), 180),
          },
        ]

        const result = privateService.isTwentyEightDayRecallPossible(shortSentences, revocationDate)

        expect(result).toBe(false)
      })

      it('should return false for mixed sentences with SLED within 14 days', () => {
        const mixedSentences = [
          {
            sentenceId: 'sent1',
            sentenceLengthDays: 180, // Under 12 months
            unadjustedSled: addDays(new Date('2023-01-01'), 180),
          },
          {
            sentenceId: 'sent2',
            sentenceLengthDays: 730, // Over 12 months
            unadjustedSled: addDays(revocationDate, 10), // Within 14 days
          },
        ]

        const result = privateService.isTwentyEightDayRecallPossible(mixedSentences, revocationDate)

        expect(result).toBe(false)
      })

      it('should return true for mixed sentences with SLED after 14 days', () => {
        const mixedSentences = [
          {
            sentenceId: 'sent1',
            sentenceLengthDays: 180, // Under 12 months
            unadjustedSled: addDays(new Date('2023-01-01'), 180),
          },
          {
            sentenceId: 'sent2',
            sentenceLengthDays: 730, // Over 12 months
            unadjustedSled: addDays(revocationDate, 20), // After 14 days
          },
        ]

        const result = privateService.isTwentyEightDayRecallPossible(mixedSentences, revocationDate)

        expect(result).toBe(true)
      })
    })
  })

  describe('sentence classification', () => {})

  describe('court case processing', () => {
    it('should process court cases correctly', () => {
      const result = privateService.processCourtCases([mockCourtCase])

      expect(result).toHaveLength(1)
      expect(result[0].caseRefAndCourt).toContain('Case REF001')
      expect(result[0].caseRefAndCourt).toContain('Test Court')
      expect(result[0].hasEligibleSentences).toBe(true)
      expect(result[0].sentences).toHaveLength(1)
    })

    it('should handle court cases with no sentences', () => {
      const emptyCase: CourtCase = {
        ...mockCourtCase,
        sentences: [],
      }

      const result = privateService.processCourtCases([emptyCase])

      expect(result).toHaveLength(0)
    })

    it('should handle court cases with both eligible and ineligible sentences', () => {
      const mixedCase: CourtCase = {
        ...mockCourtCase,
        sentences: [mockSdsSentence, mockNonSdsSentence],
      }

      const result = privateService.processCourtCases([mixedCase])

      expect(result).toHaveLength(1)
      expect(result[0].hasEligibleSentences).toBe(true)
      expect(result[0].hasIneligibleSentences).toBe(false) // Both SDS and non-SDS sentences are eligible
    })

    it('should handle court cases with truly ineligible sentences', () => {
      const legacySentence: RecallableCourtCaseSentence = {
        ...mockSdsSentence,
        sentenceType: undefined, // This will make it RAS_LEGACY_SENTENCE with recallRoute: 'MANUAL'
      }

      const mixedCase: CourtCase = {
        ...mockCourtCase,
        sentences: [mockSdsSentence, legacySentence],
      }

      const result = privateService.processCourtCases([mixedCase])

      expect(result).toHaveLength(1)
      expect(result[0].hasEligibleSentences).toBe(true)
      expect(result[0].hasIneligibleSentences).toBe(false) // Even legacy sentences are eligible (MANUAL route)
    })
  })

  describe('SDS filtering', () => {
    it('should not filter when no non-SDS sentences present', () => {
      const sdsGroups = [
        {
          sentences: [{ classification: 'STANDARD', sentenceUuid: 'sent1' }],
          eligibleSentences: [{ sentenceId: 'sent1' }],
          ineligibleSentences: [] as Array<unknown>,
        },
      ]

      const result = privateService.applySdsFiltering(sdsGroups, false)

      expect(result).toHaveLength(1)
      expect(result[0].sentences).toHaveLength(1)
    })

    it('should filter out non-SDS sentences when present', () => {
      const mixedGroups = [
        {
          sentences: [
            { classification: 'STANDARD', sentenceUuid: 'sent1' },
            { classification: 'EXTENDED', sentenceUuid: 'sent2' },
          ],
          eligibleSentences: [{ sentenceId: 'sent1' }, { sentenceId: 'sent2' }],
          ineligibleSentences: [] as Array<unknown>,
        },
      ]

      const result = privateService.applySdsFiltering(mixedGroups, true)

      expect(result).toHaveLength(1)
      expect(result[0].sentences).toHaveLength(1)
      expect(result[0].sentences[0].classification).toBe('STANDARD')
    })

    it('should remove groups with no SDS sentences', () => {
      const nonSdsGroups = [
        {
          sentences: [{ classification: 'EXTENDED', sentenceUuid: 'sent1' }],
          eligibleSentences: [{ sentenceId: 'sent1' }],
          ineligibleSentences: [] as Array<unknown>,
        },
      ]

      const result = privateService.applySdsFiltering(nonSdsGroups, true)

      expect(result).toHaveLength(0)
    })
  })

  describe('FTR period validation', () => {
    describe('isRevocationDateWithinFtrPeriod', () => {
      it('should return true for date within 14-day FTR period', () => {
        const ftrRecall: Recall = {
          ...mockFtrRecall,
          revocationDate: new Date('2023-05-20'),
          returnToCustodyDate: new Date('2023-05-21'),
        }

        const testDate = new Date('2023-05-25') // Within 14 days

        const result = privateService.isRevocationDateWithinFtrPeriod(testDate, ftrRecall)

        expect(result).toBe(true)
      })

      it('should return false for date outside 14-day FTR period', () => {
        const ftrRecall: Recall = {
          ...mockFtrRecall,
          revocationDate: new Date('2023-05-01'),
          returnToCustodyDate: new Date('2023-05-02'),
        }

        const testDate = new Date('2023-05-20') // Outside 14 days

        const result = privateService.isRevocationDateWithinFtrPeriod(testDate, ftrRecall)

        expect(result).toBe(false)
      })

      it('should return true for date within 28-day FTR period', () => {
        const ftr28Recall: Recall = {
          ...mockFtrRecall,
          recallType: {
            code: 'FTR_28',
            description: 'Twenty Eight Day Fixed Term Recall',
            fixedTerm: true,
          },
          revocationDate: new Date('2023-05-01'),
          returnToCustodyDate: new Date('2023-05-02'),
        }

        const testDate = new Date('2023-05-20') // Within 28 days

        const result = privateService.isRevocationDateWithinFtrPeriod(testDate, ftr28Recall)

        expect(result).toBe(true)
      })

      it('should return false for non-FTR recall types', () => {
        const standardRecall: Recall = {
          ...mockRecall,
          recallType: {
            code: 'STANDARD',
            description: 'Standard Recall',
            fixedTerm: false,
          },
        }

        const testDate = new Date('2023-05-20')

        const result = privateService.isRevocationDateWithinFtrPeriod(testDate, standardRecall)

        expect(result).toBe(false)
      })
    })

    describe('getFtrPeriodDays', () => {
      it('should return 14 for FTR_14', () => {
        const result = privateService.getFtrPeriodDays('FTR_14')
        expect(result).toBe(14)
      })

      it('should return 14 for FTR_HDC_14', () => {
        const result = privateService.getFtrPeriodDays('FTR_HDC_14')
        expect(result).toBe(14)
      })

      it('should return 28 for FTR_28', () => {
        const result = privateService.getFtrPeriodDays('FTR_28')
        expect(result).toBe(28)
      })

      it('should return 28 for FTR_HDC_28', () => {
        const result = privateService.getFtrPeriodDays('FTR_HDC_28')
        expect(result).toBe(28)
      })

      it('should return null for unknown types', () => {
        const result = privateService.getFtrPeriodDays('UNKNOWN')
        expect(result).toBeNull()
      })
    })

    describe('determineReferenceDate', () => {
      it('should return revocation date when prisoner was in prison', () => {
        const inPrisonRecall: Recall = {
          ...mockRecall,
          ual: undefined,
          revocationDate: new Date('2023-05-01'),
        }

        const result = privateService.determineReferenceDate(inPrisonRecall)

        expect(result).toEqual(new Date('2023-05-01'))
      })

      it('should return return to custody date when prisoner was UAL', () => {
        const ualRecall: Recall = {
          ...mockRecall,
          ual: { firstDay: new Date('2023-05-01'), lastDay: new Date('2023-05-05'), days: 4 },
          revocationDate: new Date('2023-05-01'),
          returnToCustodyDate: new Date('2023-05-05'),
        }

        const result = privateService.determineReferenceDate(ualRecall)

        expect(result).toEqual(new Date('2023-05-05'))
      })

      it('should return day after revocation when UAL but no return to custody date', () => {
        const ualRecall: Recall = {
          ...mockRecall,
          ual: { firstDay: new Date('2023-05-01'), lastDay: new Date('2023-05-05'), days: 4 },
          revocationDate: new Date('2023-05-01'),
          returnToCustodyDate: null,
        }

        const result = privateService.determineReferenceDate(ualRecall)

        expect(result).toEqual(new Date('2023-05-02'))
      })
    })
  })

  describe('sentence length helpers', () => {
    it('should correctly identify sentences under 12 months', () => {
      const shortSentences = [{ sentenceLengthDays: 180 }, { sentenceLengthDays: 300 }]

      const result = privateService.hasSentencesUnderTwelveMonths(shortSentences)

      expect(result).toBe(true)
    })

    it('should correctly identify sentences over 12 months', () => {
      const longSentences = [{ sentenceLengthDays: 400 }, { sentenceLengthDays: 730 }]

      const result = privateService.hasSentencesEqualToOrOverTwelveMonths(longSentences)

      expect(result).toBe(true)
    })

    it('should get latest expiry date for 12+ month sentences', () => {
      const sentences = [
        { sentenceLengthDays: 180, unadjustedSled: new Date('2023-06-01') }, // Under 12 months
        { sentenceLengthDays: 400, unadjustedSled: new Date('2023-12-01') }, // Over 12 months
        { sentenceLengthDays: 730, unadjustedSled: new Date('2024-01-01') }, // Over 12 months
      ]

      const result = privateService.getLatestExpiryDateOfTwelveMonthPlusSentences(sentences)

      expect(result).toEqual(new Date('2024-01-01'))
    })

    it('should handle sentences with null SLED', () => {
      const sentences = [
        { sentenceLengthDays: 400, unadjustedSled: null },
        { sentenceLengthDays: 730, unadjustedSled: new Date('2024-01-01') },
      ]

      const result = privateService.getLatestExpiryDateOfTwelveMonthPlusSentences(sentences)

      expect(result).toEqual(new Date('2024-01-01'))
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty court cases array', async () => {
      const result = await service.assessRecallEligibility({
        courtCases: [],
        adjustments: [],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [],
        revocationDate,
      })

      expect(result.isValid).toBe(true)
      expect(result.routing).toBe('NO_SENTENCES_FOR_RECALL')
      expect(result.eligibilityDetails.eligibleSentenceCount).toBe(0)
    })

    it('should handle court cases with undefined sentences', async () => {
      const caseWithUndefinedSentences: CourtCase = {
        ...mockCourtCase,
        sentences: undefined,
      }

      const result = await service.assessRecallEligibility({
        courtCases: [caseWithUndefinedSentences],
        adjustments: [],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [],
        revocationDate,
      })

      expect(result.isValid).toBe(true)
      expect(result.routing).toBe('NO_SENTENCES_FOR_RECALL')
    })

    it('should handle sentences with missing required fields', async () => {
      const incompleteSentence: RecallableCourtCaseSentence = {
        sentenceUuid: 'sent1',
        sentenceTypeUuid: 'test-sentence-type-uuid-incomplete',
        offenceCode: 'OFF001',
        outcomeDescription: 'Incomplete sentence',
        isRecallable: true,
        systemOfRecord: 'NOMIS',
        periodLengths: [],
        // Missing other required fields
      }

      const incompleteCase: CourtCase = {
        ...mockCourtCase,
        sentences: [incompleteSentence],
      }

      const result = await service.assessRecallEligibility({
        courtCases: [incompleteCase],
        adjustments: [],
        existingRecalls: [],
        breakdown: mockCalculationBreakdown,
        validationMessages: [],
        revocationDate,
      })

      // The sentence without sentenceType is processed as RAS_LEGACY_SENTENCE with MANUAL routing
      expect(result.isValid).toBe(true)
      expect(result.routing).toBe('MANUAL_REVIEW_REQUIRED')
      expect(result.eligibilityDetails.eligibleSentenceCount).toBe(1)
    })

    it('should handle adjustments with missing dates', () => {
      const incompleteAdjustment: AdjustmentDto = {
        ...mockAdjustment,
        fromDate: null,
        toDate: null,
      }

      const result = privateService.validateAgainstAdjustments(revocationDate, [incompleteAdjustment])

      expect(result.isValid).toBe(true)
      expect(result.validationMessages).toHaveLength(0)
    })

    it('should handle recalls without return to custody date', () => {
      const incompleteRecall: Recall = {
        ...mockRecall,
        returnToCustodyDate: null,
      }

      const result = privateService.validateAgainstExistingRecalls(revocationDate, [incompleteRecall])

      expect(result.isValid).toBe(true)
      expect(result.validationMessages).toHaveLength(0)
    })

    it('should handle null and undefined inputs gracefully', () => {
      const result1 = privateService.getRecallsToConsiderForValidation(null)
      const result2 = privateService.getRecallsToConsiderForValidation(undefined)
      const result3 = privateService.getAdjustmentsToConsiderForValidation(null)
      const result4 = privateService.getAdjustmentsToConsiderForValidation(undefined)

      expect(result1).toEqual([])
      expect(result2).toEqual([])
      expect(result3).toEqual([])
      expect(result4).toEqual([])
    })
  })
})
