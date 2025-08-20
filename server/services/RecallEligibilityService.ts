import { addDays, isAfter, isBefore, isEqual, isValid, max, min } from 'date-fns'
import { compact } from 'lodash'
// eslint-disable-next-line import/no-unresolved
import { CourtCase, Recall } from 'models'
import { RecallableCourtCaseSentence } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { CalculationBreakdown, ValidationMessage } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { eligibilityReasons, RecallEligibility } from '../@types/recallEligibility'
import { RecallType, RecallTypes } from '../@types/recallTypes'
import { SummarisedSentence, SummarisedSentenceGroup } from '../utils/sentenceUtils'
import { AdjustmentDto } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import { RecallJourneyData } from '../helpers/formWizardHelper'
import { isCriticalValidationError } from '../utils/constants'
import logger from '../../logger'

export interface RecallEligibilityRequest {
  courtCases: CourtCase[]
  adjustments: AdjustmentDto[]
  existingRecalls: Recall[]
  breakdown: CalculationBreakdown | null
  validationMessages: ValidationMessage[]
  revocationDate: Date
  journeyData?: RecallJourneyData
}

/**
 * Centralised service for all recall eligibility calculations and validations
 */
export class RecallEligibilityService {
  // Core eligibility assessment - main entry point
  async assessRecallEligibility(request: RecallEligibilityRequest): Promise<RecallEligibilityAssessment> {
    const { courtCases, adjustments, existingRecalls, validationMessages, revocationDate, journeyData } = request

    // 1. Validate revocation date against basic constraints
    const dateValidation = this.validateRevocationDate(
      revocationDate,
      courtCases,
      adjustments,
      existingRecalls,
      journeyData,
    )
    if (!dateValidation.isValid) {
      return {
        isValid: false,
        routing: 'CONFLICTING_ADJUSTMENTS',
        eligibilityDetails: {
          invalidRecallTypes: [],
          eligibleSentenceCount: 0,
          hasNonSdsSentences: false,
          courtCaseSummary: [],
        },
        validationMessages: dateValidation.validationMessages,
      }
    }

    // 2. Process court cases and sentences
    const processedCases = this.processCourtCases(courtCases)

    // 3. Determine routing based on CRDS validation
    const crdsRouting = this.determineCrdsRouting(validationMessages)

    // 4. Check for non-SDS sentences
    const hasNonSdsSentences = this.hasNonSdsSentences(processedCases)

    // 5. Apply SDS filtering if needed
    const filteredCases = this.applySdsFiltering(processedCases, hasNonSdsSentences)

    // 6. Calculate invalid recall types
    const invalidRecallTypes = this.calculateInvalidRecallTypes(filteredCases, revocationDate)

    // 7. Determine final routing
    const finalRouting = this.determineFinalRouting(crdsRouting, hasNonSdsSentences, filteredCases)

    // 8. Calculate eligible sentence count
    const eligibleSentenceCount = this.calculateEligibleSentenceCount(filteredCases)

    return {
      isValid: finalRouting !== 'CONFLICTING_ADJUSTMENTS',
      routing: finalRouting,
      eligibilityDetails: {
        invalidRecallTypes,
        eligibleSentenceCount,
        hasNonSdsSentences,
        courtCaseSummary: this.buildCourtCaseSummary(filteredCases),
      },
      validationMessages: dateValidation.validationMessages,
    }
  }

  // RAS sentence eligibility assessment
  private assessRasSentenceEligibility(sentence: RecallableCourtCaseSentence): RecallEligibility {
    const { sentenceType } = sentence
    if (!sentenceType) {
      return eligibilityReasons.RAS_LEGACY_SENTENCE
    }
    if (this.isNonSDS(sentenceType)) {
      return eligibilityReasons.NON_SDS
    }
    return eligibilityReasons.SDS
  }

  // Fixed-term recall eligibility checks
  private isFourteenDayRecallPossible(sentences: SummarisedSentence[], revocationDate: Date): boolean {
    if (this.hasSentencesUnderTwelveMonths(sentences) && !this.hasSentencesEqualToOrOverTwelveMonths(sentences)) {
      logger.debug('All sentences are under twelve months')
      return true
    }
    const latestExpiryDateOfTwelveMonthPlusSentences = this.getLatestExpiryDateOfTwelveMonthPlusSentences(sentences)

    logger.debug('Mixture of sentence lengths')

    const fourteenDaysFromRecall = addDays(revocationDate, 14)
    logger.debug(
      `Checking if latest SLED [${latestExpiryDateOfTwelveMonthPlusSentences}] is over 14 days from date of recall [${fourteenDaysFromRecall}]`,
    )

    return (
      isValid(latestExpiryDateOfTwelveMonthPlusSentences) &&
      (isEqual(latestExpiryDateOfTwelveMonthPlusSentences, fourteenDaysFromRecall) ||
        isBefore(latestExpiryDateOfTwelveMonthPlusSentences, fourteenDaysFromRecall))
    )
  }

  private isTwentyEightDayRecallPossible(sentences: SummarisedSentence[], revocationDate: Date): boolean {
    if (this.hasSentencesEqualToOrOverTwelveMonths(sentences) && !this.hasSentencesUnderTwelveMonths(sentences)) {
      logger.debug('All sentences are over twelve months')
      return true
    }
    if (this.hasSentencesUnderTwelveMonths(sentences) && !this.hasSentencesEqualToOrOverTwelveMonths(sentences)) {
      logger.debug('All sentences are under twelve months')
      return false
    }
    const latestExpiryDateOfTwelveMonthPlusSentences = this.getLatestExpiryDateOfTwelveMonthPlusSentences(sentences)
    logger.debug('Mixture of sentence lengths')

    const fourteenDaysFromRecall = addDays(revocationDate, 14)
    logger.debug(
      `Checking if latest SLED [${latestExpiryDateOfTwelveMonthPlusSentences}] is over 14 days from date of recall [${fourteenDaysFromRecall}]`,
    )

    return (
      isValid(latestExpiryDateOfTwelveMonthPlusSentences) &&
      isAfter(latestExpiryDateOfTwelveMonthPlusSentences, fourteenDaysFromRecall)
    )
  }

  // Validation methods
  private validateRevocationDate(
    revocationDate: Date,
    courtCases: CourtCase[],
    adjustments: AdjustmentDto[],
    existingRecalls: Recall[],
    journeyData?: RecallJourneyData,
  ): ValidationResult {
    const validationMessages: ValidationMessage[] = []

    // 1. Validate against sentence dates
    const sentences = this.extractSentencesFromCases(courtCases)
    if (sentences.length) {
      const earliestSentenceDate = min(sentences.map(s => new Date(s.convictionDate || s.offenceStartDate || '')))
      if (isBefore(revocationDate, earliestSentenceDate)) {
        validationMessages.push({
          code: 'REMAND_ON_OR_AFTER_SENTENCE_DATE',
          message: 'Revocation date must be after earliest sentence date',
          arguments: [],
          type: 'VALIDATION',
        })
      }
    }

    // 2. Validate against adjustments
    const adjustmentValidation = this.validateAgainstAdjustments(revocationDate, adjustments, journeyData)
    if (!adjustmentValidation.isValid) {
      validationMessages.push(...adjustmentValidation.validationMessages)
    }

    // 3. Validate against existing recalls
    const recallValidation = this.validateAgainstExistingRecalls(revocationDate, existingRecalls, journeyData)
    if (!recallValidation.isValid) {
      validationMessages.push(...recallValidation.validationMessages)
    }

    return {
      isValid: validationMessages.length === 0,
      validationMessages,
    }
  }

  private validateAgainstAdjustments(
    revocationDate: Date,
    adjustments: AdjustmentDto[],
    journeyData?: RecallJourneyData,
  ): ValidationResult {
    const validationMessages: ValidationMessage[] = []

    // Filter adjustments to consider (exclude adjustments linked to current recall in edit mode)
    const adjustmentsToConsider = this.getAdjustmentsToConsiderForValidation(adjustments, journeyData)

    const isWithinAdjustment = adjustmentsToConsider.some((adjustment: AdjustmentDto) => {
      if (!adjustment.fromDate || !adjustment.toDate) return false

      return (
        (isEqual(revocationDate, adjustment.fromDate) || isAfter(revocationDate, adjustment.fromDate)) &&
        isBefore(revocationDate, adjustment.toDate)
      )
    })

    if (isWithinAdjustment) {
      validationMessages.push({
        code: 'ADJUSTMENT_FUTURE_DATED_UAL',
        message: 'Revocation date cannot be within adjustment period',
        arguments: [],
        type: 'VALIDATION',
      })
    }

    return {
      isValid: validationMessages.length === 0,
      validationMessages,
    }
  }

  private validateAgainstExistingRecalls(
    revocationDate: Date,
    existingRecalls: Recall[],
    journeyData?: RecallJourneyData,
  ): ValidationResult {
    const validationMessages: ValidationMessage[] = []

    // Filter recalls to consider (exclude current recall in edit mode)
    const recallsToConsider = this.getRecallsToConsiderForValidation(existingRecalls, journeyData)

    // Check if revocation date is on or before any existing recall
    const hasDateOnOrBeforeExisting = recallsToConsider.some(
      recall => isEqual(revocationDate, recall.revocationDate) || isBefore(revocationDate, recall.revocationDate),
    )

    if (hasDateOnOrBeforeExisting) {
      validationMessages.push({
        code: 'CONCURRENT_CONSECUTIVE_SENTENCES_DURATION',
        message: 'You cannot create a recall with a revocation date on or before the existing recall',
        arguments: [],
        type: 'VALIDATION',
      })
    }

    // Check for FTR period overlaps
    const hasFtrOverlap = recallsToConsider.some(recall => {
      if (!recall.recallType?.fixedTerm) {
        return false // Only check FTR recalls
      }
      return this.isRevocationDateWithinFtrPeriod(revocationDate, recall)
    })

    if (hasFtrOverlap) {
      validationMessages.push({
        code: 'FTR_SENTENCES_CONFLICT_WITH_EACH_OTHER',
        message: 'The date entered overlaps with an existing recall',
        arguments: [],
        type: 'VALIDATION',
      })
    }

    return {
      isValid: validationMessages.length === 0,
      validationMessages,
    }
  }

  // Helper methods
  private processCourtCases(courtCases: CourtCase[]): SummarisedSentenceGroup[] {
    const processedCases: SummarisedSentenceGroup[] = []

    courtCases.forEach(courtCase => {
      const processedCase = this.processCourtCase(courtCase)
      if (processedCase) {
        processedCases.push(processedCase)
      }
    })

    return processedCases
  }

  private processCourtCase(courtCase: CourtCase): SummarisedSentenceGroup | null {
    const summarisedGroup: SummarisedSentenceGroup = {
      caseRefAndCourt: `Case ${courtCase.reference ?? 'held'} at ${courtCase.locationName || courtCase.location} on ${courtCase.date}`,
      caseReference: courtCase.reference ?? 'Unknown',
      courtName: courtCase.locationName || courtCase.location || 'Unknown Court',
      ineligibleSentences: [],
      hasIneligibleSentences: false,
      eligibleSentences: [],
      sentences: [],
      hasEligibleSentences: false,
    }

    courtCase.sentences?.forEach(sentence => {
      if (!sentence) return

      const recallEligibility = this.assessRasSentenceEligibility(sentence)
      const summarisedSentence: SummarisedSentence = {
        sentenceId: sentence.sentenceUuid,
        recallEligibility,
        summary: compact([]),
        offenceCode: sentence.offenceCode,
        offenceDescription: sentence.offenceDescription,
        sentenceDate: sentence.sentenceDate ?? null,
      }

      if (recallEligibility.recallRoute !== 'NOT_POSSIBLE') {
        summarisedGroup.hasEligibleSentences = true
        summarisedGroup.eligibleSentences.push(summarisedSentence)
      } else {
        summarisedGroup.hasIneligibleSentences = true
        summarisedGroup.ineligibleSentences.push(summarisedSentence)
      }

      summarisedGroup.sentences.push(sentence)
    })

    return summarisedGroup.sentences.length > 0 ? summarisedGroup : null
  }


  private determineCrdsRouting(validationMessages: ValidationMessage[]): RecallRoute {
    if (validationMessages && validationMessages.length === 0) {
      return 'NORMAL'
    }

    const errorCodes = validationMessages.map(v => v.code)
    if (errorCodes.some(code => isCriticalValidationError(code))) {
      return 'NO_SENTENCES_FOR_RECALL'
    }

    return 'MANUAL_REVIEW_REQUIRED'
  }

  private hasNonSdsSentences(cases: SummarisedSentenceGroup[]): boolean {
    return cases.some(group => group.sentences.some(s => this.hasSentence(s) && s.classification !== 'STANDARD'))
  }

  private applySdsFiltering(cases: SummarisedSentenceGroup[], hasNonSds: boolean): SummarisedSentenceGroup[] {
    if (!hasNonSds) {
      return cases
    }

    // Filter to only include SDS sentences
    return cases
      .map(group => {
        const filteredMainSentences = group.sentences.filter(
          s => this.hasSentence(s) && s.classification === 'STANDARD',
        )
        const sdsSentenceUuids = new Set(filteredMainSentences.map(s => s.sentenceUuid))
        const filteredEligibleSentences = group.eligibleSentences.filter(es => sdsSentenceUuids.has(es.sentenceId))
        const filteredIneligibleSentences = group.ineligibleSentences.filter(is => sdsSentenceUuids.has(is.sentenceId))

        return {
          ...group,
          sentences: filteredMainSentences,
          eligibleSentences: filteredEligibleSentences,
          ineligibleSentences: filteredIneligibleSentences,
          hasEligibleSentences: filteredEligibleSentences.length > 0,
          hasIneligibleSentences: filteredIneligibleSentences.length > 0,
        }
      })
      .filter(group => group.sentences.length > 0)
  }

  private calculateInvalidRecallTypes(cases: SummarisedSentenceGroup[], revocationDate: Date): RecallType[] {
    const eligibleSentences = cases.flatMap(g => g.eligibleSentences)
    return compact([
      ...new Set([
        ...eligibleSentences.flatMap(s => s.recallEligibility.ineligibleRecallTypes),
        ...this.getInvalidFixedTermTypes(eligibleSentences, revocationDate),
      ]),
    ])
  }

  private getInvalidFixedTermTypes(sentences: SummarisedSentence[], revocationDate: Date): RecallType[] {
    const invalidFixedTerms: RecallType[] = []
    if (!this.isFourteenDayRecallPossible(sentences, revocationDate)) {
      invalidFixedTerms.push(RecallTypes.HDC_FOURTEEN_DAY_RECALL, RecallTypes.FOURTEEN_DAY_FIXED_TERM_RECALL)
    }
    if (!this.isTwentyEightDayRecallPossible(sentences, revocationDate)) {
      invalidFixedTerms.push(RecallTypes.HDC_TWENTY_EIGHT_DAY_RECALL, RecallTypes.TWENTY_EIGHT_DAY_FIXED_TERM_RECALL)
    }
    return invalidFixedTerms
  }

  private determineFinalRouting(
    crdsRouting: RecallRoute,
    hasNonSds: boolean,
    filteredCases: SummarisedSentenceGroup[],
  ): RecallRoute {
    if (crdsRouting === 'NO_SENTENCES_FOR_RECALL') {
      return 'NO_SENTENCES_FOR_RECALL'
    }

    if (filteredCases.length === 0 || !filteredCases.some(group => group.hasEligibleSentences)) {
      return 'NO_SENTENCES_FOR_RECALL'
    }

    // Check if any sentences require manual routing
    const hasManualRoutingSentences = filteredCases.some(group =>
      group.eligibleSentences.some(sentence => sentence.recallEligibility.recallRoute === 'MANUAL'),
    )

    if (hasNonSds || crdsRouting === 'MANUAL_REVIEW_REQUIRED' || hasManualRoutingSentences) {
      return 'MANUAL_REVIEW_REQUIRED'
    }

    return 'NORMAL'
  }

  private calculateEligibleSentenceCount(cases: SummarisedSentenceGroup[]): number {
    return cases.flatMap(g => g.eligibleSentences.flatMap(s => s.sentenceId)).length
  }

  private buildCourtCaseSummary(cases: SummarisedSentenceGroup[]): CourtCaseSummary[] {
    return cases.map(group => ({
      caseReference: this.extractCaseReference(group.caseRefAndCourt),
      courtName: this.extractCourtName(group.caseRefAndCourt),
      hasEligibleSentences: group.hasEligibleSentences,
      sentenceCount: group.sentences.length,
    }))
  }

  private isSDS(sentenceDescription: string): boolean {
    return sentenceDescription.includes('Standard Determinate Sentence')
  }

  private isNonSDS(sentenceDescription: string): boolean {
    return !this.isSDS(sentenceDescription)
  }

  private hasSentence(item: unknown): item is { classification?: string; sentenceUuid?: string } {
    return typeof item === 'object' && item !== null && 'classification' in item
  }

  private hasSentencesUnderTwelveMonths(sentences: SummarisedSentence[]): boolean {
    return sentences.some(sentence => sentence.sentenceLengthDays && sentence.sentenceLengthDays < 365)
  }

  private hasSentencesEqualToOrOverTwelveMonths(sentences: SummarisedSentence[]): boolean {
    return sentences.some(sentence => sentence.sentenceLengthDays && sentence.sentenceLengthDays >= 365)
  }

  private getLatestExpiryDateOfTwelveMonthPlusSentences(sentences: SummarisedSentence[]): Date {
    return max(
      sentences
        .filter(s => s.unadjustedSled !== null)
        .filter(s => s.sentenceLengthDays && s.sentenceLengthDays >= 365)
        .map(s => s.unadjustedSled),
    )
  }

  private extractSentencesFromCases(courtCases: CourtCase[]): RecallableCourtCaseSentence[] {
    return courtCases.flatMap(courtCase => courtCase.sentences || [])
  }

  private getRecallsToConsiderForValidation(allRecalls: Recall[], journeyData?: RecallJourneyData): Recall[] {
    if (!allRecalls || allRecalls.length === 0) {
      return []
    }

    if (journeyData?.isEdit && journeyData.storedRecall?.recallId) {
      return allRecalls.filter(recall => recall.recallId !== journeyData.storedRecall?.recallId)
    }

    return allRecalls
  }

  private getAdjustmentsToConsiderForValidation(
    allAdjustments: AdjustmentDto[],
    journeyData?: RecallJourneyData,
  ): AdjustmentDto[] {
    if (!allAdjustments || allAdjustments.length === 0) {
      return []
    }

    if (journeyData?.isEdit && journeyData.storedRecall?.recallId) {
      // In edit mode, exclude adjustments linked to the current recall being edited
      return allAdjustments.filter(adjustment => adjustment.recallId !== journeyData.storedRecall?.recallId)
    }

    return allAdjustments
  }

  private isRevocationDateWithinFtrPeriod(revocationDate: Date, existingRecall: Recall): boolean {
    const ftrDays = this.getFtrPeriodDays(existingRecall.recallType.code)
    if (!ftrDays) {
      return false
    }

    const referenceDate = this.determineReferenceDate(existingRecall)
    if (!referenceDate) {
      return false
    }

    const ftrEndDate = addDays(referenceDate, ftrDays)

    return (
      (isEqual(revocationDate, referenceDate) || isAfter(revocationDate, referenceDate)) &&
      (isEqual(revocationDate, ftrEndDate) || isBefore(revocationDate, ftrEndDate))
    )
  }

  private getFtrPeriodDays(recallTypeCode: string): number | null {
    switch (recallTypeCode) {
      case 'FTR_14':
      case 'FTR_HDC_14':
        return 14
      case 'FTR_28':
      case 'FTR_HDC_28':
        return 28
      default:
        return null
    }
  }

  private determineReferenceDate(existingRecall: Recall): Date | null {
    const wasInPrisonAtRecall = !existingRecall.ual

    if (wasInPrisonAtRecall) {
      return existingRecall.revocationDate
    }

    return existingRecall.returnToCustodyDate || addDays(existingRecall.revocationDate, 1)
  }

  private extractCaseReference(caseRefAndCourt: string): string {
    const match = caseRefAndCourt.match(/Case (.+?) at/)
    return match ? match[1] : 'Unknown'
  }

  private extractCourtName(caseRefAndCourt: string): string {
    const match = caseRefAndCourt.match(/at (.+?) on/)
    return match ? match[1] : 'Unknown Court'
  }
}

export interface RecallEligibilityAssessment {
  isValid: boolean
  routing: RecallRoute
  eligibilityDetails: {
    invalidRecallTypes: RecallType[]
    eligibleSentenceCount: number
    hasNonSdsSentences: boolean
    courtCaseSummary: CourtCaseSummary[]
  }
  validationMessages: ValidationMessage[]
}

export interface ValidationResult {
  isValid: boolean
  validationMessages: ValidationMessage[]
}

export interface CourtCaseSummary {
  caseReference: string
  courtName: string
  hasEligibleSentences: boolean
  sentenceCount: number
}

export type RecallRoute = 'NORMAL' | 'MANUAL_REVIEW_REQUIRED' | 'NO_SENTENCES_FOR_RECALL' | 'CONFLICTING_ADJUSTMENTS'
