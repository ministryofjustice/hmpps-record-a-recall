import { isBefore, isAfter, isEqual, addDays } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import { RecallJourneyData } from '../helpers/formWizardHelper'

/**
 * Validates if a revocation date overlaps with existing recalls
 * Based on business rules for FTR periods and recall dates
 */

export interface RecallOverlapValidationResult {
  isValid: boolean
  errorType?: 'overlapsFixedTermRecall' | 'onOrBeforeExistingRecall'
}

/**
 * Main validation function for recall overlap detection
 * Implements all ACs for both create and edit modes
 */
export function validateRevocationDateAgainstRecalls(
  revocationDate: Date,
  existingRecalls: Recall[],
  journeyData: RecallJourneyData,
): RecallOverlapValidationResult {
  // Filter recalls to consider (exclude current recall in edit mode)
  const recallsToConsider = getRecallsToConsiderForValidation(existingRecalls, journeyData)

  // AC5 & AC11: Check if revocation date is on or before any existing recall
  const hasDateOnOrBeforeExisting = recallsToConsider.some(
    recall => isEqual(revocationDate, recall.revocationDate) || isBefore(revocationDate, recall.revocationDate),
  )

  if (hasDateOnOrBeforeExisting) {
    return {
      isValid: false,
      errorType: 'onOrBeforeExistingRecall',
    }
  }

  // AC1-4 & AC7-10: Check for FTR period overlaps
  const hasFtrOverlap = recallsToConsider.some(recall => {
    if (!recall.recallType?.fixedTerm) {
      return false // Only check FTR recalls
    }

    return isRevocationDateWithinFtrPeriod(revocationDate, recall, journeyData)
  })

  if (hasFtrOverlap) {
    return {
      isValid: false,
      errorType: 'overlapsFixedTermRecall',
    }
  }

  return { isValid: true }
}

/**
 * Filter recalls to consider for validation
 * AC6: Excludes current recall when editing
 */
export function getRecallsToConsiderForValidation(allRecalls: Recall[], journeyData: RecallJourneyData): Recall[] {
  if (!allRecalls || allRecalls.length === 0) {
    return []
  }

  // In edit mode, exclude the current recall being edited
  if (journeyData.isEdit && journeyData.storedRecall?.recallId) {
    return allRecalls.filter(recall => recall.recallId !== journeyData.storedRecall?.recallId)
  }

  return allRecalls
}

/**
 * Check if revocation date falls within an FTR period
 * Handles both "already in prison" and "not in prison" scenarios
 */
function isRevocationDateWithinFtrPeriod(
  revocationDate: Date,
  existingRecall: Recall,
  journeyData: RecallJourneyData,
): boolean {
  const ftrDays = getFtrPeriodDays(existingRecall.recallType.code)
  if (!ftrDays) {
    return false
  }

  // Determine the reference date for the FTR period
  // AC1-2 (already in prison): Use revocation date
  // AC3-4 (not in prison): Use return to custody date
  const referenceDate = determineReferenceDate(existingRecall, journeyData)
  if (!referenceDate) {
    return false
  }

  // Calculate FTR period end date
  const ftrEndDate = addDays(referenceDate, ftrDays)

  // Check if revocation date is within the FTR period
  return (
    (isEqual(revocationDate, referenceDate) || isAfter(revocationDate, referenceDate)) &&
    (isEqual(revocationDate, ftrEndDate) || isBefore(revocationDate, ftrEndDate))
  )
}

/**
 * Get the number of days for an FTR period based on recall type
 */
function getFtrPeriodDays(recallTypeCode: string): number | null {
  switch (recallTypeCode) {
    case 'FTR_14':
    case 'FTR_HDC_14':
      return 14
    case 'FTR_28':
    case 'FTR_HDC_28':
      return 28
    default:
      return null // Not an FTR
  }
}

/**
 * Determine the reference date for FTR period calculation
 * Based on whether the offender was in prison at the time of recall
 */
function determineReferenceDate(existingRecall: Recall, _journeyData: RecallJourneyData): Date | null {
  // For AC1-2 (already in prison): Use revocation date
  // For AC3-4 (not in prison): Use return to custody date

  // Check if the existing recall was for someone already in prison
  // If we have UAL, they were not in prison (UAL = Unlawfully at Large)
  const wasInPrisonAtRecall = !existingRecall.ual

  if (wasInPrisonAtRecall) {
    // AC1-2: Use revocation date
    return existingRecall.revocationDate
  }
  // AC3-4: Use return to custody date
  // If no return to custody date, fallback to revocation date + 1 day (start of UAL period)
  return existingRecall.returnToCustodyDate || addDays(existingRecall.revocationDate, 1)
}

/**
 * Get active recalls from res.locals that should be considered for validation
 * Only includes active recalls (not soft-deleted or withdrawn)
 */
export function getActiveRecallsForValidation(recalls: Recall[]): Recall[] {
  if (!recalls || recalls.length === 0) {
    return []
  }

  // Filter to only active recalls
  // Based on BA answers: only check against active recalls
  return recalls.filter(_recall => {
    // Add any additional filtering logic here if recall status becomes available
    // For now, assume all recalls in the array are active
    return true
  })
}
