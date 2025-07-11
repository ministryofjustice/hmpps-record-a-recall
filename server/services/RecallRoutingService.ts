// eslint-disable-next-line import/no-unresolved
import { CourtCase, Recall } from 'models'
import {
  RecallEligibilityService,
  RecallEligibilityAssessment,
  RecallRoute,
  CourtCaseSummary,
} from './RecallEligibilityService'
import { AdjustmentDto } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import { CalculationBreakdown, ValidationMessage } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { RecallJourneyData } from '../helpers/formWizardHelper'
import { RecallableCourtCaseSentence } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { eligibilityReasons, RecallEligibility } from '../@types/recallEligibility'
import { RecallType } from '../@types/recallTypes'
import { isCriticalValidationError } from '../utils/constants'
import logger from '../../logger'

/**
 * Centralized service for recall routing decisions
 * Orchestrates the recall eligibility assessment and determines the appropriate user journey
 */
export class RecallRoutingService {
  private eligibilityService: RecallEligibilityService

  constructor() {
    this.eligibilityService = new RecallEligibilityService()
  }

  /**
   * filtering for court cases with non-recallable sentences
   * Filters court cases to exclude those with only non-recallable sentences
   * and checks if any cases were filtered out
   */
  private filterCourtCasesWithNonRecallableSentences(cases: CourtCase[]): {
    filteredCases: CourtCase[]
    wereCasesFilteredOut: boolean
  } {
    const filteredCases = cases.filter(courtCase => {
      if (!courtCase.sentences || courtCase.sentences.length === 0) {
        return false // Exclude cases with no sentences
      }

      // Check if case has at least one recallable sentence
      return courtCase.sentences.some((sentence: RecallableCourtCaseSentence) => sentence.isRecallable === true)
    })

    // Check if we filtered out cases (meaning some had only non-recallable sentences)
    const wereCasesFilteredOut = filteredCases.length < cases.length

    return { filteredCases, wereCasesFilteredOut }
  }

  /**
   * Apply smart routing override logic
   * If routing would be MANUAL due to non-critical validation failures AND cases were filtered out,
   * override to NORMAL routing and use filtered cases
   */
  private applySmartRoutingOverride(
    initialRouting: RecallRoute,
    initialEligibility: RecallEligibility,
    courtCases: CourtCase[],
    wereCasesFilteredOut: boolean,
  ): { routing: RecallRoute; eligibility: RecallEligibility; casesToUse: CourtCase[] } {
    if (
      initialRouting === 'MANUAL_REVIEW_REQUIRED' &&
      initialEligibility === eligibilityReasons.NON_CRITICAL_VALIDATION_FAIL &&
      wereCasesFilteredOut
    ) {
      logger.info('Applying smart routing override: MANUAL -> NORMAL due to non-recallable sentence filtering')

      const { filteredCases } = this.filterCourtCasesWithNonRecallableSentences(courtCases)

      return {
        routing: 'NORMAL',
        eligibility: eligibilityReasons.HAPPY_PATH_POSSIBLE,
        casesToUse: filteredCases,
      }
    }

    return {
      routing: initialRouting,
      eligibility: initialEligibility,
      casesToUse: courtCases,
    }
  }

  /**
   * Main entry point for recall routing decisions
   * This method orchestrates all the business logic and returns a routing decision
   */
  async routeRecall(request: RecallRoutingRequest): Promise<RecallRoutingResponse> {
    try {
      logger.info(`Processing recall routing for prisoner ${request.nomsId}`)

      // 1. Perform comprehensive eligibility assessment
      const eligibilityAssessment = await this.eligibilityService.assessRecallEligibility(
        request.courtCases,
        request.adjustments,
        request.existingRecalls,
        request.calculationBreakdown,
        request.validationMessages,
        request.revocationDate,
        request.journeyData,
      )

      // 2. Determine next steps based on routing
      const nextSteps = this.determineNextSteps(eligibilityAssessment)

      // 3. Build comprehensive response
      const response: RecallRoutingResponse = {
        routing: eligibilityAssessment.routing,
        isValid: eligibilityAssessment.isValid,
        eligibilityDetails: eligibilityAssessment.eligibilityDetails,
        validationMessages: eligibilityAssessment.validationMessages,
        nextSteps,
        processingMetadata: {
          assessmentTimestamp: new Date().toISOString(),
          nomsId: request.nomsId,
          revocationDate: request.revocationDate.toISOString(),
          totalCourtCases: request.courtCases.length,
          totalExistingRecalls: request.existingRecalls.length,
          hasCalculationBreakdown: !!request.calculationBreakdown,
        },
      }

      logger.info(`Recall routing completed for prisoner ${request.nomsId}: ${eligibilityAssessment.routing}`)
      return response
    } catch (error) {
      logger.error(`Error in recall routing for prisoner ${request.nomsId}:`, error)

      // Return error response that allows graceful handling
      return {
        routing: 'MANUAL_REVIEW_REQUIRED',
        isValid: false,
        eligibilityDetails: {
          invalidRecallTypes: [],
          eligibleSentenceCount: 0,
          hasNonSdsSentences: false,
          courtCaseSummary: [],
        },
        validationMessages: [
          {
            code: 'UNSUPPORTED_SENTENCE_TYPE',
            message: 'An error occurred during recall routing assessment',
            arguments: [],
            type: 'VALIDATION',
          },
        ],
        nextSteps: {
          userJourney: 'MANUAL_REVIEW',
          requiredActions: ['CONTACT_SUPPORT'],
          canProceedAutomatically: false,
        },
        processingMetadata: {
          assessmentTimestamp: new Date().toISOString(),
          nomsId: request.nomsId,
          revocationDate: request.revocationDate.toISOString(),
          totalCourtCases: request.courtCases.length,
          totalExistingRecalls: request.existingRecalls.length,
          hasCalculationBreakdown: !!request.calculationBreakdown,
          error: error.message,
        },
      }
    }
  }

  /**
   * Comprehensive routing with smart filtering for CheckPossibleController
   * Handles the complete logic including CRDS validation, smart filtering, and routing override
   */
  async routeRecallWithSmartFiltering(
    nomsId: string,
    courtCases: CourtCase[],
    adjustments: AdjustmentDto[],
    existingRecalls: Recall[],
    calculationBreakdown: CalculationBreakdown | null,
    validationMessages: ValidationMessage[],
    journeyData?: RecallJourneyData,
  ): Promise<SmartRoutingResponse> {
    try {
      logger.info(`Processing recall routing with smart filtering for prisoner ${nomsId}`)

      // 1. Filter to active cases only
      const activeCases = courtCases.filter(caseItem => caseItem.status === 'ACTIVE')

      // 2. Apply non-recallable sentence filtering
      const { filteredCases, wereCasesFilteredOut } = this.filterCourtCasesWithNonRecallableSentences(activeCases)

      // 3. Determine initial routing from CRDS validation
      const initialRouting = this.determineCrdsRouting(validationMessages)
      const initialEligibility = this.mapValidationToEligibility(validationMessages)

      // 4. Apply smart routing override if applicable
      const { routing, eligibility, casesToUse } = this.applySmartRoutingOverride(
        initialRouting,
        initialEligibility,
        activeCases,
        wereCasesFilteredOut,
      )

      // 5. If we have a revocation date, run full eligibility assessment
      let fullAssessment: RecallEligibilityAssessment | null = null
      if (journeyData && journeyData.revocationDate) {
        fullAssessment = await this.eligibilityService.assessRecallEligibility(
          casesToUse,
          adjustments,
          existingRecalls,
          calculationBreakdown,
          validationMessages,
          journeyData.revocationDate,
          journeyData,
        )
      }

      // Generate session and local updates based on routing decision
      const sessionUpdates = this.generateSessionUpdates(routing, eligibility, validationMessages)
      const localUpdates = this.generateLocalUpdates(routing, validationMessages)

      return {
        routing,
        eligibility,
        casesToUse,
        wereCasesFilteredOut,
        initialRouting,
        smartOverrideApplied: routing !== initialRouting,
        fullAssessment,
        sessionUpdates,
        localUpdates,
        processingMetadata: {
          assessmentTimestamp: new Date().toISOString(),
          nomsId,
          totalCourtCases: courtCases.length,
          activeCases: activeCases.length,
          filteredCases: filteredCases.length,
          totalExistingRecalls: existingRecalls.length,
          hasCalculationBreakdown: !!calculationBreakdown,
        },
      }
    } catch (error) {
      logger.error(`Error in smart routing for prisoner ${nomsId}:`, error)
      throw error
    }
  }

  /**
   * Map validation messages to eligibility reasons
   */
  private mapValidationToEligibility(validationMessages: ValidationMessage[]): RecallEligibility {
    if (!validationMessages || validationMessages.length === 0) {
      return eligibilityReasons.HAPPY_PATH_POSSIBLE
    }

    const errorCodes = validationMessages.map(v => v.code)
    if (errorCodes.some(code => isCriticalValidationError(code))) {
      return eligibilityReasons.CRITICAL_VALIDATION_FAIL
    }

    return eligibilityReasons.NON_CRITICAL_VALIDATION_FAIL
  }

  /**
   * Generate session model updates based on routing decision
   * This centralizes all session management logic that was previously in controller locals methods
   */
  private generateSessionUpdates(
    routing: RecallRoute,
    eligibility: RecallEligibility,
    validationMessages: ValidationMessage[],
  ): SessionUpdates {
    const updates: SessionUpdates = {}

    updates.recallEligibility = eligibility

    // Set routing-specific session fields
    switch (routing) {
      case 'NO_SENTENCES_FOR_RECALL':
        updates.crdsErrors = validationMessages.map(error => error.message)
        break

      case 'MANUAL_REVIEW_REQUIRED':
        updates.manualCaseSelection = true
        break

      case 'NORMAL':
        updates.manualCaseSelection = false
        break

      case 'CONFLICTING_ADJUSTMENTS':
        break

      default:
        // No specific session updates for unknown routing types
        break
    }

    return updates
  }

  /**
   * Generate response locals updates based on routing decision
   * This centralises all locals management logic that was previously in controller locals methods
   */
  private generateLocalUpdates(routing: RecallRoute, validationMessages: ValidationMessage[]): LocalUpdates {
    const updates: LocalUpdates = {}

    // Set routing-specific local fields
    if (routing === 'NO_SENTENCES_FOR_RECALL') {
      updates.crdsValidationErrors = validationMessages.map(error => error.message)
    }

    return updates
  }

  /**
   * Determine routing from CRDS validation messages
   */
  private determineCrdsRouting(validationMessages: ValidationMessage[]): RecallRoute {
    if (!validationMessages || validationMessages.length === 0) {
      return 'NORMAL'
    }

    const errorCodes = validationMessages.map(v => v.code)
    if (errorCodes.some(code => isCriticalValidationError(code))) {
      return 'NO_SENTENCES_FOR_RECALL'
    }

    return 'MANUAL_REVIEW_REQUIRED'
  }

  /**
   * Determine next steps based on routing decision
   */
  private determineNextSteps(assessment: RecallEligibilityAssessment): NextSteps {
    switch (assessment.routing) {
      case 'NORMAL':
        return {
          userJourney: 'AUTOMATED_FLOW',
          requiredActions: ['SELECT_RECALL_TYPE', 'CONFIRM_DETAILS'],
          canProceedAutomatically: true,
          recommendedRecallTypes: this.getRecommendedRecallTypes(assessment),
        }

      case 'MANUAL_REVIEW_REQUIRED':
        return {
          userJourney: 'MANUAL_REVIEW',
          requiredActions: assessment.eligibilityDetails.hasNonSdsSentences
            ? ['REVIEW_NON_SDS_SENTENCES', 'MANUAL_CASE_SELECTION']
            : ['REVIEW_VALIDATION_ISSUES', 'MANUAL_VERIFICATION'],
          canProceedAutomatically: false,
          manualReviewReasons: this.getManualReviewReasons(assessment),
        }

      case 'NO_SENTENCES_FOR_RECALL':
        return {
          userJourney: 'CANNOT_PROCEED',
          requiredActions: ['CONTACT_SUPPORT'],
          canProceedAutomatically: false,
          blockingReasons: this.getBlockingReasons(assessment),
        }

      case 'CONFLICTING_ADJUSTMENTS':
        return {
          userJourney: 'RESOLVE_CONFLICTS',
          requiredActions: ['REVIEW_ADJUSTMENTS', 'SELECT_DIFFERENT_DATE'],
          canProceedAutomatically: false,
          conflictDetails: this.getConflictDetails(assessment),
        }

      default:
        return {
          userJourney: 'MANUAL_REVIEW',
          requiredActions: ['CONTACT_SUPPORT'],
          canProceedAutomatically: false,
        }
    }
  }

  private getRecommendedRecallTypes(assessment: RecallEligibilityAssessment): string[] {
    const availableTypes = ['STANDARD_RECALL']

    if (!assessment.eligibilityDetails.invalidRecallTypes.some(type => type.code === 'FTR_14')) {
      availableTypes.push('FOURTEEN_DAY_FIXED_TERM_RECALL')
    }

    if (!assessment.eligibilityDetails.invalidRecallTypes.some(type => type.code === 'FTR_28')) {
      availableTypes.push('TWENTY_EIGHT_DAY_FIXED_TERM_RECALL')
    }

    return availableTypes
  }

  private getManualReviewReasons(assessment: RecallEligibilityAssessment): string[] {
    const reasons = []

    if (assessment.eligibilityDetails.hasNonSdsSentences) {
      reasons.push('NON_SDS_SENTENCES_PRESENT')
    }

    if (assessment.validationMessages.length > 0) {
      reasons.push('VALIDATION_WARNINGS')
    }

    return reasons
  }

  private getBlockingReasons(assessment: RecallEligibilityAssessment): string[] {
    const reasons = []

    if (assessment.eligibilityDetails.eligibleSentenceCount === 0) {
      reasons.push('NO_ELIGIBLE_SENTENCES')
    }

    const criticalErrors = assessment.validationMessages.filter(v => v.code.includes('CRITICAL')).map(v => v.code)

    return [...reasons, ...criticalErrors]
  }

  private getConflictDetails(assessment: RecallEligibilityAssessment): ConflictDetails {
    const adjustmentConflicts = assessment.validationMessages
      .filter(v => v.code.includes('ADJUSTMENT'))
      .map(v => v.message)

    const recallConflicts = assessment.validationMessages.filter(v => v.code.includes('RECALL')).map(v => v.message)

    return {
      adjustmentConflicts,
      recallConflicts,
    }
  }
}

// Type definitions for the routing service
export interface SessionUpdates {
  recallEligibility?: RecallEligibility
  crdsErrors?: string[]
  manualCaseSelection?: boolean
}

export interface LocalUpdates {
  crdsValidationErrors?: string[]
}

export interface RecallRoutingRequest {
  nomsId: string
  revocationDate: Date
  courtCases: CourtCase[]
  adjustments: AdjustmentDto[]
  existingRecalls: Recall[]
  calculationBreakdown: CalculationBreakdown | null
  validationMessages: ValidationMessage[]
  journeyData?: RecallJourneyData
}

export interface RecallRoutingResponse {
  routing: RecallRoute
  isValid: boolean
  eligibilityDetails: {
    invalidRecallTypes: RecallType[]
    eligibleSentenceCount: number
    hasNonSdsSentences: boolean
    courtCaseSummary: CourtCaseSummary[]
  }
  validationMessages: ValidationMessage[]
  nextSteps: NextSteps
  processingMetadata: ProcessingMetadata
}

export interface BasicRecallRoutingResponse {
  routing: RecallRoute
  isValid: boolean
  canProceedAutomatically: boolean
  requiredActions: string[]
  eligibleSentenceCount: number
  hasNonSdsSentences: boolean
  validationMessages: ValidationMessage[]
}

export interface SmartRoutingResponse {
  routing: RecallRoute
  eligibility: RecallEligibility
  casesToUse: CourtCase[]
  wereCasesFilteredOut: boolean
  initialRouting: RecallRoute
  smartOverrideApplied: boolean
  fullAssessment: RecallEligibilityAssessment | null
  sessionUpdates: SessionUpdates
  localUpdates: LocalUpdates
  processingMetadata: {
    assessmentTimestamp: string
    nomsId: string
    totalCourtCases: number
    activeCases: number
    filteredCases: number
    totalExistingRecalls: number
    hasCalculationBreakdown: boolean
  }
}

export interface NextSteps {
  userJourney: 'AUTOMATED_FLOW' | 'MANUAL_REVIEW' | 'CANNOT_PROCEED' | 'RESOLVE_CONFLICTS'
  requiredActions: string[]
  canProceedAutomatically: boolean
  recommendedRecallTypes?: string[]
  manualReviewReasons?: string[]
  blockingReasons?: string[]
  conflictDetails?: ConflictDetails
}

export interface ConflictDetails {
  adjustmentConflicts: string[]
  recallConflicts: string[]
}

export interface ProcessingMetadata {
  assessmentTimestamp: string
  nomsId: string
  revocationDate: string
  totalCourtCases: number
  totalExistingRecalls: number
  hasCalculationBreakdown: boolean
  error?: string
}
