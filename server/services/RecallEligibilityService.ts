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
import {
  determineCrdsRouting,
  RECALL_PERIODS,
  SENTENCE_THRESHOLDS,
  RECALL_VALIDATION_ERRORS,
  RecallRoute,
} from '../utils/constants'
import logger from '../../logger'

/**
 * Request object for recall eligibility assessment
 */
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

    const dateValidation = this.validateRevocationDate(
      revocationDate,
      courtCases,
      adjustments,
      existingRecalls,
      journeyData,
    )
    if (!dateValidation.isValid) {
      return this.buildInvalidDateResponse(dateValidation.validationMessages)
    }

    const assessmentData = this.buildEligibilityAssessmentData(courtCases, validationMessages, revocationDate)

    return this.buildEligibilityAssessment(assessmentData, dateValidation.validationMessages)
  }

  private buildInvalidDateResponse(validationMessages: ValidationMessage[]): RecallEligibilityAssessment {
    return {
      isValid: false,
      routing: 'CONFLICTING_ADJUSTMENTS',
      eligibilityDetails: {
        invalidRecallTypes: [],
        eligibleSentenceCount: 0,
        hasNonSdsSentences: false,
        courtCaseSummary: [],
      },
      validationMessages,
    }
  }

  private buildEligibilityAssessmentData(
    courtCases: CourtCase[],
    validationMessages: ValidationMessage[],
    revocationDate: Date,
  ): EligibilityAssessmentData {
    // Process court cases and sentences
    const processedCases = this.processCourtCases(courtCases)

    // Determine routing based on CRDS validation
    const crdsRouting = determineCrdsRouting(validationMessages)

    // Check for non-SDS sentences and apply filtering
    const hasNonSdsSentences = this.hasNonSdsSentences(processedCases)
    const filteredCases = this.applySdsFiltering(processedCases, hasNonSdsSentences)

    // Calculate routing and eligibility details
    const invalidRecallTypes = this.calculateInvalidRecallTypes(filteredCases, revocationDate)
    const finalRouting = this.determineFinalRouting(crdsRouting, hasNonSdsSentences, filteredCases)
    const eligibleSentenceCount = this.calculateEligibleSentenceCount(filteredCases)

    return {
      processedCases,
      crdsRouting,
      hasNonSdsSentences,
      filteredCases,
      invalidRecallTypes,
      finalRouting,
      eligibleSentenceCount,
    }
  }

  private buildEligibilityAssessment(
    data: EligibilityAssessmentData,
    validationMessages: ValidationMessage[],
  ): RecallEligibilityAssessment {
    return {
      isValid: data.finalRouting !== 'CONFLICTING_ADJUSTMENTS',
      routing: data.finalRouting,
      eligibilityDetails: {
        invalidRecallTypes: data.invalidRecallTypes,
        eligibleSentenceCount: data.eligibleSentenceCount,
        hasNonSdsSentences: data.hasNonSdsSentences,
        courtCaseSummary: this.buildCourtCaseSummary(data.filteredCases),
      },
      validationMessages,
    }
  }

  // RAS sentence eligibility assessment
  private assessRasSentenceEligibility(sentence: RecallableCourtCaseSentence): RecallEligibility {
    const { sentenceType } = sentence
    if (!sentenceType) {
      return eligibilityReasons.RAS_LEGACY_SENTENCE
    }
    if (this.isNonSDS(sentence)) {
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

    const fourteenDaysFromRecall = addDays(revocationDate, RECALL_PERIODS.FOURTEEN_DAYS)
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

    const fourteenDaysFromRecall = addDays(revocationDate, RECALL_PERIODS.FOURTEEN_DAYS)
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
          code: RECALL_VALIDATION_ERRORS.OFFENCE_DATE_AFTER_SENTENCE_START_DATE,
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
      if (!this.isValidAdjustment(adjustment) || !adjustment.fromDate || !adjustment.toDate) return false

      const fromDate = new Date(adjustment.fromDate)
      const toDate = new Date(adjustment.toDate)

      if (!this.isValidDate(fromDate) || !this.isValidDate(toDate)) return false

      return (
        (isEqual(revocationDate, fromDate) || isAfter(revocationDate, fromDate)) && isBefore(revocationDate, toDate)
      )
    })

    if (isWithinAdjustment) {
      validationMessages.push({
        code: RECALL_VALIDATION_ERRORS.ADJUSTMENT_FUTURE_DATED_UAL,
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
    const hasDateOnOrBeforeExisting = recallsToConsider.some(recall => {
      if (!this.isValidRecall(recall) || !recall.revocationDate) return false

      const recallRevocationDate = new Date(recall.revocationDate)
      if (!this.isValidDate(recallRevocationDate)) return false

      return isEqual(revocationDate, recallRevocationDate) || isBefore(revocationDate, recallRevocationDate)
    })

    if (hasDateOnOrBeforeExisting) {
      validationMessages.push({
        code: RECALL_VALIDATION_ERRORS.FTR_SENTENCES_CONFLICT_WITH_EACH_OTHER,
        message: 'Revocation date cannot be on or before existing recall date',
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
        code: RECALL_VALIDATION_ERRORS.FTR_SENTENCES_CONFLICT_WITH_EACH_OTHER,
        message: 'Revocation date overlaps with existing Fixed Term Recall period',
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

  private hasNonSdsSentences(cases: SummarisedSentenceGroup[]): boolean {
    return cases.some(group => group.sentences.some(s => this.isValidSentence(s) && s.classification !== 'STANDARD'))
  }

  private applySdsFiltering(cases: SummarisedSentenceGroup[], hasNonSds: boolean): SummarisedSentenceGroup[] {
    if (!hasNonSds) {
      return cases
    }

    // Filter to only include SDS sentences
    return cases
      .map(group => {
        const filteredMainSentences = group.sentences.filter(
          s => this.isValidSentence(s) && s.classification === 'STANDARD',
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

    if (hasNonSds || crdsRouting === 'MANUAL_REVIEW_REQUIRED') {
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

  private isNonSDS(sentence: RecallableCourtCaseSentence): boolean {
    return sentence.classification !== 'STANDARD'
  }

  private isValidSentence(item: RecallableCourtCaseSentence | null | undefined): item is RecallableCourtCaseSentence {
    return item !== null && item !== undefined
  }

  private isValidDate(date: Date | string | null | undefined): date is Date {
    if (date instanceof Date) {
      return !Number.isNaN(date.getTime())
    }
    return false
  }

  private isValidAdjustment(adjustment: AdjustmentDto | null | undefined): adjustment is AdjustmentDto {
    return (
      adjustment !== null &&
      adjustment !== undefined &&
      adjustment.fromDate !== undefined &&
      adjustment.toDate !== undefined
    )
  }

  private isValidRecall(recall: Recall | null | undefined): recall is Recall {
    return recall !== null && recall !== undefined
  }

  private hasValidSentenceLength(
    sentence: SummarisedSentence,
  ): sentence is SummarisedSentence & { sentenceLengthDays: number } {
    return typeof sentence.sentenceLengthDays === 'number' && sentence.sentenceLengthDays > 0
  }

  private hasSentencesUnderTwelveMonths(sentences: SummarisedSentence[]): boolean {
    return sentences.some(
      sentence =>
        this.hasValidSentenceLength(sentence) &&
        sentence.sentenceLengthDays < SENTENCE_THRESHOLDS.TWELVE_MONTHS_IN_DAYS,
    )
  }

  private hasSentencesEqualToOrOverTwelveMonths(sentences: SummarisedSentence[]): boolean {
    return sentences.some(
      sentence =>
        this.hasValidSentenceLength(sentence) &&
        sentence.sentenceLengthDays >= SENTENCE_THRESHOLDS.TWELVE_MONTHS_IN_DAYS,
    )
  }

  private getLatestExpiryDateOfTwelveMonthPlusSentences(sentences: SummarisedSentence[]): Date {
    return max(
      sentences
        .filter(s => s.unadjustedSled !== null && this.isValidDate(s.unadjustedSled))
        .filter(
          s => this.hasValidSentenceLength(s) && s.sentenceLengthDays >= SENTENCE_THRESHOLDS.TWELVE_MONTHS_IN_DAYS,
        )
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
    if (!caseRefAndCourt || typeof caseRefAndCourt !== 'string') {
      return 'Unknown'
    }

    // More robust pattern that handles various edge cases
    // Format: "Case {reference} at {court} on {date}"
    const patterns = [
      /^Case\s+(.+?)\s+at\s+.+?\s+on\s+.+$/i, // Standard format
      /^Case\s+(.+?)\s+at\s+/i, // Fallback without date requirement
      /Case\s+([^a-z\s]*\w[^a-z]*)/i, // Extract reference-like content (alphanumeric with possible special chars)
    ]

    for (const pattern of patterns) {
      const match = caseRefAndCourt.match(pattern)
      if (match && match[1]?.trim()) {
        return match[1].trim()
      }
    }

    return 'Unknown'
  }

  private extractCourtName(caseRefAndCourt: string): string {
    if (!caseRefAndCourt || typeof caseRefAndCourt !== 'string') {
      return 'Unknown Court'
    }

    // More robust pattern that handles various edge cases
    // Format: "Case {reference} at {court} on {date}"
    const patterns = [
      /^Case\s+.+?\s+at\s+(.+?)\s+on\s+.+$/i, // Standard format
      /\s+at\s+(.+?)\s+on\s+/i, // Extract court between "at" and "on"
      /\s+at\s+(.+?)$/i, // Fallback without date requirement
    ]

    for (const pattern of patterns) {
      const match = caseRefAndCourt.match(pattern)
      if (match && match[1]?.trim()) {
        return match[1].trim()
      }
    }

    return 'Unknown Court'
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

export interface EligibilityAssessmentData {
  processedCases: SummarisedSentenceGroup[]
  crdsRouting: RecallRoute
  hasNonSdsSentences: boolean
  filteredCases: SummarisedSentenceGroup[]
  invalidRecallTypes: RecallType[]
  finalRouting: RecallRoute
  eligibleSentenceCount: number
}
