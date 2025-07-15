import { jest } from '@jest/globals'
// eslint-disable-next-line import/no-unresolved
import { CourtCase, Recall } from 'models'
import { RecallRoutingService } from './RecallRoutingService'
import { RecallEligibilityService } from './RecallEligibilityService'
import { eligibilityReasons } from '../@types/recallEligibility'

import { AdjustmentDto } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import { ValidationMessage, CalculationBreakdown } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { RecallJourneyData } from '../helpers/formWizardHelper'
import { RecallableCourtCaseSentence } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { determineCrdsRouting } from '../utils/constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceAsAny = any

// Create a sentence mock that matches both interfaces
const createMockSentence = (overrides: Partial<RecallableCourtCaseSentence> = {}): RecallableCourtCaseSentence => ({
  sentenceUuid: 'sent1',
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
  ...overrides,
})

jest.mock('./RecallEligibilityService')
jest.mock('../../logger')

describe('RecallRoutingService', () => {
  let service: RecallRoutingService
  let privateService: ServiceAsAny
  let mockEligibilityService: jest.Mocked<RecallEligibilityService>

  const mockCourtCase: CourtCase = {
    caseId: 'case1',
    reference: 'REF001',
    locationName: 'Test Court',
    location: 'TC',
    date: '2023-01-01',
    status: 'ACTIVE',
    sentenced: true,
    sentences: [createMockSentence()],
  }

  const mockRecall: Recall = {
    recallId: 'recall1',
    createdAt: '2023-06-01T10:00:00Z',
    revocationDate: new Date('2023-06-01'),
    returnToCustodyDate: new Date('2023-06-02'),
    recallType: {
      code: 'STANDARD',
      description: 'Standard Recall',
      fixedTerm: false,
    },
    location: 'TEST',
    locationName: 'Test Location',
    sentenceIds: ['sent1'],
    courtCaseIds: ['case1'],
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

  const mockCalculationBreakdown: CalculationBreakdown = {
    concurrentSentences: [],
    consecutiveSentence: undefined,
    otherDates: {},
    breakdownByReleaseDateType: {},
    ersedNotApplicableDueToDtoLaterThanCrd: false,
    showSds40Hints: false,
  }

  const mockValidationMessage: ValidationMessage = {
    code: 'UNSUPPORTED_SENTENCE_TYPE',
    message: 'Test validation message',
    arguments: [],
    type: 'VALIDATION',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockEligibilityService = new RecallEligibilityService() as jest.Mocked<RecallEligibilityService>
    service = new RecallRoutingService()
    privateService = service as ServiceAsAny
    privateService.eligibilityService = mockEligibilityService
  })

  describe('constructor', () => {
    it('should initialize with RecallEligibilityService', () => {
      const newService = new RecallRoutingService()
      expect(newService).toBeDefined()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((newService as any).eligibilityService).toBeInstanceOf(RecallEligibilityService)
    })
  })

  describe('routeRecall', () => {
    const mockRequest = {
      nomsId: 'A1234BC',
      revocationDate: new Date('2023-06-01'),
      courtCases: [mockCourtCase],
      adjustments: [mockAdjustment],
      existingRecalls: [mockRecall],
      calculationBreakdown: mockCalculationBreakdown,
      validationMessages: [] as ValidationMessage[],
      journeyData: { revocationDate: new Date('2023-06-01') } as RecallJourneyData,
    }

    it('should return successful routing response for normal flow', async () => {
      const mockAssessment = {
        isValid: true,
        routing: 'NORMAL' as const,
        eligibilityDetails: {
          invalidRecallTypes: [] as Array<{
            code: 'LR' | 'FTR_14' | 'FTR_28' | 'FTR_HDC_14' | 'FTR_HDC_28' | 'CUR_HDC' | 'IN_HDC'
            description: string
            fixedTerm: boolean
          }>,
          eligibleSentenceCount: 1,
          hasNonSdsSentences: false,
          courtCaseSummary: [] as Array<{
            caseReference: string
            courtName: string
            hasEligibleSentences: boolean
            sentenceCount: number
          }>,
        },
        validationMessages: [] as ValidationMessage[],
      }

      mockEligibilityService.assessRecallEligibility.mockResolvedValue(mockAssessment)

      const response = await service.routeRecall(mockRequest)

      expect(response).toEqual({
        routing: 'NORMAL',
        isValid: true,
        eligibilityDetails: mockAssessment.eligibilityDetails,
        validationMessages: [] as ValidationMessage[],
        nextSteps: {
          userJourney: 'AUTOMATED_FLOW',
          requiredActions: ['SELECT_RECALL_TYPE', 'CONFIRM_DETAILS'],
          canProceedAutomatically: true,
          recommendedRecallTypes: [
            'STANDARD_RECALL',
            'FOURTEEN_DAY_FIXED_TERM_RECALL',
            'TWENTY_EIGHT_DAY_FIXED_TERM_RECALL',
          ],
        },
        processingMetadata: expect.objectContaining({
          nomsId: 'A1234BC',
          totalCourtCases: 1,
          totalExistingRecalls: 1,
          hasCalculationBreakdown: true,
        }),
      })

      expect(mockEligibilityService.assessRecallEligibility).toHaveBeenCalledWith({
        courtCases: mockRequest.courtCases,
        adjustments: mockRequest.adjustments,
        existingRecalls: mockRequest.existingRecalls,
        breakdown: mockRequest.calculationBreakdown,
        validationMessages: mockRequest.validationMessages,
        revocationDate: mockRequest.revocationDate,
        journeyData: mockRequest.journeyData,
      })
    })

    it('should return manual review response when required', async () => {
      const mockAssessment = {
        isValid: true,
        routing: 'MANUAL_REVIEW_REQUIRED' as const,
        eligibilityDetails: {
          invalidRecallTypes: [] as Array<{
            code: 'LR' | 'FTR_14' | 'FTR_28' | 'FTR_HDC_14' | 'FTR_HDC_28' | 'CUR_HDC' | 'IN_HDC'
            description: string
            fixedTerm: boolean
          }>,
          eligibleSentenceCount: 1,
          hasNonSdsSentences: true,
          courtCaseSummary: [] as Array<{
            caseReference: string
            courtName: string
            hasEligibleSentences: boolean
            sentenceCount: number
          }>,
        },
        validationMessages: [mockValidationMessage],
      }

      mockEligibilityService.assessRecallEligibility.mockResolvedValue(mockAssessment)

      const response = await service.routeRecall(mockRequest)

      expect(response.routing).toBe('MANUAL_REVIEW_REQUIRED')
      expect(response.nextSteps.userJourney).toBe('MANUAL_REVIEW')
      expect(response.nextSteps.requiredActions).toContain('REVIEW_NON_SDS_SENTENCES')
      expect(response.nextSteps.canProceedAutomatically).toBe(false)
    })

    it('should return no sentences response when no eligible sentences', async () => {
      const mockAssessment = {
        isValid: false,
        routing: 'NO_SENTENCES_FOR_RECALL' as const,
        eligibilityDetails: {
          invalidRecallTypes: [] as Array<{
            code: 'LR' | 'FTR_14' | 'FTR_28' | 'FTR_HDC_14' | 'FTR_HDC_28' | 'CUR_HDC' | 'IN_HDC'
            description: string
            fixedTerm: boolean
          }>,
          eligibleSentenceCount: 0,
          hasNonSdsSentences: false,
          courtCaseSummary: [] as Array<{
            caseReference: string
            courtName: string
            hasEligibleSentences: boolean
            sentenceCount: number
          }>,
        },
        validationMessages: [mockValidationMessage],
      }

      mockEligibilityService.assessRecallEligibility.mockResolvedValue(mockAssessment)

      const response = await service.routeRecall(mockRequest)

      expect(response.routing).toBe('NO_SENTENCES_FOR_RECALL')
      expect(response.nextSteps.userJourney).toBe('CANNOT_PROCEED')
      expect(response.nextSteps.requiredActions).toContain('CONTACT_SUPPORT')
      expect(response.nextSteps.canProceedAutomatically).toBe(false)
    })

    it('should return conflicting adjustments response', async () => {
      const mockAssessment = {
        isValid: false,
        routing: 'CONFLICTING_ADJUSTMENTS' as const,
        eligibilityDetails: {
          invalidRecallTypes: [] as Array<{
            code: 'LR' | 'FTR_14' | 'FTR_28' | 'FTR_HDC_14' | 'FTR_HDC_28' | 'CUR_HDC' | 'IN_HDC'
            description: string
            fixedTerm: boolean
          }>,
          eligibleSentenceCount: 1,
          hasNonSdsSentences: false,
          courtCaseSummary: [] as Array<{
            caseReference: string
            courtName: string
            hasEligibleSentences: boolean
            sentenceCount: number
          }>,
        },
        validationMessages: [
          {
            code: 'ADJUSTMENT_FUTURE_DATED_UAL' as const,
            message: 'Adjustment conflict',
            arguments: [] as string[],
            type: 'VALIDATION' as const,
          },
        ],
      }

      mockEligibilityService.assessRecallEligibility.mockResolvedValue(mockAssessment)

      const response = await service.routeRecall(mockRequest)

      expect(response.routing).toBe('CONFLICTING_ADJUSTMENTS')
      expect(response.nextSteps.userJourney).toBe('RESOLVE_CONFLICTS')
      expect(response.nextSteps.requiredActions).toContain('REVIEW_ADJUSTMENTS')
      expect(response.nextSteps.canProceedAutomatically).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Service error')
      mockEligibilityService.assessRecallEligibility.mockRejectedValue(error)

      const response = await service.routeRecall(mockRequest)

      expect(response.routing).toBe('MANUAL_REVIEW_REQUIRED')
      expect(response.isValid).toBe(false)
      expect(response.processingMetadata.error).toBe('Service error')
      expect(response.validationMessages).toHaveLength(1)
      expect(response.validationMessages[0].code).toBe('UNSUPPORTED_SENTENCE_TYPE')
    })
  })

  describe('routeRecallWithSmartFiltering', () => {
    const mockParams = {
      nomsId: 'A1234BC',
      courtCases: [mockCourtCase],
      adjustments: [mockAdjustment],
      existingRecalls: [mockRecall],
      calculationBreakdown: mockCalculationBreakdown,
      validationMessages: [] as ValidationMessage[],
      journeyData: { revocationDate: new Date('2023-06-01') } as RecallJourneyData,
    }

    it('should apply smart filtering and return normal routing', async () => {
      const mockAssessment = {
        isValid: true,
        routing: 'NORMAL' as const,
        eligibilityDetails: {
          invalidRecallTypes: [] as Array<{
            code: 'LR' | 'FTR_14' | 'FTR_28' | 'FTR_HDC_14' | 'FTR_HDC_28' | 'CUR_HDC' | 'IN_HDC'
            description: string
            fixedTerm: boolean
          }>,
          eligibleSentenceCount: 1,
          hasNonSdsSentences: false,
          courtCaseSummary: [] as Array<{
            caseReference: string
            courtName: string
            hasEligibleSentences: boolean
            sentenceCount: number
          }>,
        },
        validationMessages: [] as ValidationMessage[],
      }

      mockEligibilityService.assessRecallEligibility.mockResolvedValue(mockAssessment)

      const response = await service.routeRecallWithSmartFiltering(
        mockParams.nomsId,
        mockParams.courtCases,
        mockParams.adjustments,
        mockParams.existingRecalls,
        mockParams.calculationBreakdown,
        mockParams.validationMessages,
        mockParams.journeyData,
      )

      expect(response.routing).toBe('NORMAL')
      expect(response.eligibility).toBe(eligibilityReasons.HAPPY_PATH_POSSIBLE)
      expect(response.wereCasesFilteredOut).toBe(false)
      expect(response.smartOverrideApplied).toBe(false)
      expect(response.processingMetadata.totalCourtCases).toBe(1)
      expect(response.processingMetadata.activeCases).toBe(1)
    })

    it('should filter out non-recallable sentences', async () => {
      const nonRecallableCase: CourtCase = {
        ...mockCourtCase,
        caseId: 'case2',
        sentences: [createMockSentence({ sentenceUuid: 'sent2', offenceCode: 'OFF002', isRecallable: false })],
      }

      const casesWithNonRecallable = [mockCourtCase, nonRecallableCase]

      const response = await service.routeRecallWithSmartFiltering(
        mockParams.nomsId,
        casesWithNonRecallable,
        mockParams.adjustments,
        mockParams.existingRecalls,
        mockParams.calculationBreakdown,
        mockParams.validationMessages,
        mockParams.journeyData,
      )

      expect(response.wereCasesFilteredOut).toBe(true)
      expect(response.casesToUse).toHaveLength(1)
      expect(response.casesToUse[0].caseId).toBe('case1')
    })

    it('should apply smart override when conditions are met', async () => {
      const nonCriticalValidation: ValidationMessage = {
        code: 'ADJUSTMENT_FUTURE_DATED_UAL' as const,
        message: 'Non-critical validation',
        arguments: [] as string[],
        type: 'VALIDATION' as const,
      }

      const casesWithNonRecallable = [
        mockCourtCase,
        {
          ...mockCourtCase,
          caseId: 'case2',
          sentences: [createMockSentence({ sentenceUuid: 'sent2', offenceCode: 'OFF002', isRecallable: false })],
        },
      ]

      const response = await service.routeRecallWithSmartFiltering(
        mockParams.nomsId,
        casesWithNonRecallable,
        mockParams.adjustments,
        mockParams.existingRecalls,
        mockParams.calculationBreakdown,
        [nonCriticalValidation],
        mockParams.journeyData,
      )

      expect(response.smartOverrideApplied).toBe(true)
      expect(response.routing).toBe('NORMAL')
      expect(response.eligibility).toBe(eligibilityReasons.HAPPY_PATH_POSSIBLE)
      expect(response.initialRouting).toBe('MANUAL_REVIEW_REQUIRED')
    })

    it('should handle inactive court cases', async () => {
      const inactiveCase: CourtCase = {
        ...mockCourtCase,
        caseId: 'case2',
        status: 'INACTIVE',
      }

      const casesWithInactive = [mockCourtCase, inactiveCase]

      const response = await service.routeRecallWithSmartFiltering(
        mockParams.nomsId,
        casesWithInactive,
        mockParams.adjustments,
        mockParams.existingRecalls,
        mockParams.calculationBreakdown,
        mockParams.validationMessages,
        mockParams.journeyData,
      )

      expect(response.processingMetadata.totalCourtCases).toBe(2)
      expect(response.processingMetadata.activeCases).toBe(1)
      expect(response.casesToUse).toHaveLength(1)
      expect(response.casesToUse[0].status).toBe('ACTIVE')
    })

    it('should handle errors in smart filtering', async () => {
      const error = new Error('Smart filtering error')
      mockEligibilityService.assessRecallEligibility.mockRejectedValue(error)

      await expect(
        service.routeRecallWithSmartFiltering(
          mockParams.nomsId,
          mockParams.courtCases,
          mockParams.adjustments,
          mockParams.existingRecalls,
          mockParams.calculationBreakdown,
          mockParams.validationMessages,
          mockParams.journeyData,
        ),
      ).rejects.toThrow('Smart filtering error')
    })
  })

  describe('private methods', () => {
    describe('filterCourtCasesWithNonRecallableSentences', () => {
      it('should filter out cases with no sentences', () => {
        const caseWithoutSentences: CourtCase = {
          ...mockCourtCase,
          caseId: 'case2',
          sentences: [],
        }

        const result = privateService.filterCourtCasesWithNonRecallableSentences([mockCourtCase, caseWithoutSentences])

        expect(result.filteredCases).toHaveLength(1)
        expect(result.filteredCases[0].caseId).toBe('case1')
        expect(result.wereCasesFilteredOut).toBe(true)
      })

      it('should filter out cases with only non-recallable sentences', () => {
        const nonRecallableCase: CourtCase = {
          ...mockCourtCase,
          caseId: 'case2',
          sentences: [createMockSentence({ sentenceUuid: 'sent2', offenceCode: 'OFF002', isRecallable: false })],
        }

        const result = privateService.filterCourtCasesWithNonRecallableSentences([mockCourtCase, nonRecallableCase])

        expect(result.filteredCases).toHaveLength(1)
        expect(result.filteredCases[0].caseId).toBe('case1')
        expect(result.wereCasesFilteredOut).toBe(true)
      })

      it('should not filter when no cases need filtering', () => {
        const result = privateService.filterCourtCasesWithNonRecallableSentences([mockCourtCase])

        expect(result.filteredCases).toHaveLength(1)
        expect(result.wereCasesFilteredOut).toBe(false)
      })
    })

    describe('mapValidationToEligibility', () => {
      it('should return HAPPY_PATH_POSSIBLE for empty validation messages', () => {
        const result = privateService.mapValidationToEligibility([])
        expect(result).toBe(eligibilityReasons.HAPPY_PATH_POSSIBLE)
      })

      it('should return CRITICAL_VALIDATION_FAIL for critical errors', () => {
        const criticalMessage: ValidationMessage = {
          code: 'UNSUPPORTED_SENTENCE_TYPE' as const,
          message: 'Critical error',
          arguments: [] as string[],
          type: 'VALIDATION' as const,
        }

        const result = privateService.mapValidationToEligibility([criticalMessage])
        expect(result).toBe(eligibilityReasons.CRITICAL_VALIDATION_FAIL)
      })

      it('should return NON_CRITICAL_VALIDATION_FAIL for non-critical errors', () => {
        const nonCriticalMessage: ValidationMessage = {
          code: 'ADJUSTMENT_FUTURE_DATED_UAL' as const,
          message: 'Non-critical error',
          arguments: [] as string[],
          type: 'VALIDATION' as const,
        }

        const result = privateService.mapValidationToEligibility([nonCriticalMessage])
        expect(result).toBe(eligibilityReasons.NON_CRITICAL_VALIDATION_FAIL)
      })
    })

    describe('determineCrdsRouting (shared utility)', () => {
      it('should return NORMAL for empty validation messages', () => {
        const result = determineCrdsRouting([])
        expect(result).toBe('NORMAL')
      })

      it('should return NO_SENTENCES_FOR_RECALL for critical errors', () => {
        const criticalMessage: ValidationMessage = {
          code: 'UNSUPPORTED_SENTENCE_TYPE' as const,
          message: 'Critical error',
          arguments: [] as string[],
          type: 'VALIDATION' as const,
        }

        const result = determineCrdsRouting([criticalMessage])
        expect(result).toBe('NO_SENTENCES_FOR_RECALL')
      })

      it('should return MANUAL_REVIEW_REQUIRED for non-critical errors', () => {
        const nonCriticalMessage: ValidationMessage = {
          code: 'ADJUSTMENT_FUTURE_DATED_UAL' as const,
          message: 'Non-critical error',
          arguments: [] as string[],
          type: 'VALIDATION' as const,
        }

        const result = determineCrdsRouting([nonCriticalMessage])
        expect(result).toBe('MANUAL_REVIEW_REQUIRED')
      })
    })

    describe('getRecommendedRecallTypes', () => {
      it('should return all recall types when no restrictions', () => {
        const assessment = {
          eligibilityDetails: {
            invalidRecallTypes: [] as Array<{
              code: 'LR' | 'FTR_14' | 'FTR_28' | 'FTR_HDC_14' | 'FTR_HDC_28' | 'CUR_HDC' | 'IN_HDC'
              description: string
              fixedTerm: boolean
            }>,
          },
        }

        const result = privateService.getRecommendedRecallTypes(assessment)
        expect(result).toEqual([
          'STANDARD_RECALL',
          'FOURTEEN_DAY_FIXED_TERM_RECALL',
          'TWENTY_EIGHT_DAY_FIXED_TERM_RECALL',
        ])
      })

      it('should exclude 14-day FTR when invalid', () => {
        const assessment = {
          eligibilityDetails: {
            invalidRecallTypes: [{ code: 'FTR_14' }],
          },
        }

        const result = privateService.getRecommendedRecallTypes(assessment)
        expect(result).toEqual(['STANDARD_RECALL', 'TWENTY_EIGHT_DAY_FIXED_TERM_RECALL'])
      })

      it('should exclude 28-day FTR when invalid', () => {
        const assessment = {
          eligibilityDetails: {
            invalidRecallTypes: [{ code: 'FTR_28' }],
          },
        }

        const result = privateService.getRecommendedRecallTypes(assessment)
        expect(result).toEqual(['STANDARD_RECALL', 'FOURTEEN_DAY_FIXED_TERM_RECALL'])
      })
    })

    describe('generateSessionUpdates', () => {
      it('should generate correct session updates for NO_SENTENCES_FOR_RECALL', () => {
        const result = privateService.generateSessionUpdates(
          'NO_SENTENCES_FOR_RECALL',
          eligibilityReasons.CRITICAL_VALIDATION_FAIL,
          [mockValidationMessage],
        )

        expect(result.recallEligibility).toBe(eligibilityReasons.CRITICAL_VALIDATION_FAIL)
        expect(result.crdsErrors).toEqual(['Test validation message'])
      })

      it('should generate correct session updates for MANUAL_REVIEW_REQUIRED', () => {
        const result = privateService.generateSessionUpdates(
          'MANUAL_REVIEW_REQUIRED',
          eligibilityReasons.NON_CRITICAL_VALIDATION_FAIL,
          [],
        )

        expect(result.recallEligibility).toBe(eligibilityReasons.NON_CRITICAL_VALIDATION_FAIL)
        expect(result.manualCaseSelection).toBe(true)
      })

      it('should generate correct session updates for NORMAL', () => {
        const result = privateService.generateSessionUpdates('NORMAL', eligibilityReasons.HAPPY_PATH_POSSIBLE, [])

        expect(result.recallEligibility).toBe(eligibilityReasons.HAPPY_PATH_POSSIBLE)
        expect(result.manualCaseSelection).toBe(false)
      })
    })

    describe('generateLocalUpdates', () => {
      it('should generate correct local updates for NO_SENTENCES_FOR_RECALL', () => {
        const result = privateService.generateLocalUpdates('NO_SENTENCES_FOR_RECALL', [mockValidationMessage])

        expect(result.crdsValidationErrors).toEqual(['Test validation message'])
      })

      it('should generate empty local updates for other routing types', () => {
        const result = privateService.generateLocalUpdates('NORMAL', [])

        expect(result).toEqual({})
      })
    })

    describe('edge cases', () => {
      it('should handle undefined validation messages', () => {
        const result = privateService.mapValidationToEligibility(undefined)
        expect(result).toBe(eligibilityReasons.HAPPY_PATH_POSSIBLE)
      })

      it('should handle null validation messages', () => {
        const result = privateService.mapValidationToEligibility(null)
        expect(result).toBe(eligibilityReasons.HAPPY_PATH_POSSIBLE)
      })

      it('should handle cases with undefined sentences', () => {
        const caseWithUndefinedSentences: CourtCase = {
          ...mockCourtCase,
          caseId: 'case2',
          sentences: undefined,
        }

        const result = privateService.filterCourtCasesWithNonRecallableSentences([caseWithUndefinedSentences])

        expect(result.filteredCases).toHaveLength(0)
        expect(result.wereCasesFilteredOut).toBe(true)
      })

      it('should handle mixed recallable and non-recallable sentences in same case', () => {
        const mixedCase: CourtCase = {
          ...mockCourtCase,
          caseId: 'case2',
          sentences: [
            createMockSentence({
              sentenceUuid: 'sent2',
              offenceCode: 'OFF002',
              isRecallable: true,
            }),
            createMockSentence({
              sentenceUuid: 'sent3',
              offenceCode: 'OFF003',
              isRecallable: false,
            }),
          ],
        }

        const result = privateService.filterCourtCasesWithNonRecallableSentences([mixedCase])

        expect(result.filteredCases).toHaveLength(1)
        expect(result.wereCasesFilteredOut).toBe(false)
      })
    })
  })
})
