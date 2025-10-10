import { isBefore, isAfter, isEqual, addDays } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'

// Minimal type definition for recall journey data
interface RecallJourneyData {
  isEdit?: boolean
  storedRecall?: {
    recallId?: string
  }
}

/**
 * Validates if a revocation date overlaps with existing recalls
 */

export interface RecallOverlapValidationResult {
  isValid: boolean
  errorType?: 'overlapsFixedTermRecall' | 'onOrBeforeExistingRecall'
}

export function validateRevocationDateAgainstRecalls(
  revocationDate: Date,
  existingRecalls: Recall[],
  journeyData: RecallJourneyData,
): RecallOverlapValidationResult {
  // Filter recalls to consider (exclude current recall in edit mode)
  const recallsToConsider = getRecallsToConsiderForValidation(existingRecalls, journeyData)

  // Check if revocation date is on or before any existing recall
  const hasDateOnOrBeforeExisting = recallsToConsider.some(
    recall => isEqual(revocationDate, recall.revocationDate) || isBefore(revocationDate, recall.revocationDate),
  )

  if (hasDateOnOrBeforeExisting) {
    return {
      isValid: false,
      errorType: 'onOrBeforeExistingRecall',
    }
  }

  // Check for FTR period overlaps
  const hasFtrOverlap = recallsToConsider.some(recall => {
    if (!recall.recallType?.fixedTerm) {
      return false // Only check FTR recalls
    }

    return isRevocationDateWithinFtrPeriod(revocationDate, recall)
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
 * Check if revocation date falls within a FTR period
 * Handles both "already in prison" and "not in prison" scenarios
 */
function isRevocationDateWithinFtrPeriod(revocationDate: Date, existingRecall: Recall): boolean {
  const ftrDays = getFtrPeriodDays(existingRecall.recallType.code)
  if (!ftrDays) {
    return false
  }

  // Determine the reference date for the FTR period
  const referenceDate = determineReferenceDate(existingRecall)
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
function determineReferenceDate(existingRecall: Recall): Date | null {
  // Check if the existing recall was for someone already in prison
  // If we have UAL, they were not in prison
  const wasInPrisonAtRecall = !existingRecall.ual

  if (wasInPrisonAtRecall) {
    // For offenders already in prison, use revocation date as FTR period start
    return existingRecall.revocationDate
  }

  // For offenders not in prison (Unlawfully at Large), the FTR period starts from their return to custody date.
  // If the return to custody date is not yet known, we use the day after the revocation as the start of the
  // UAL period for this calculation.
  return existingRecall.returnToCustodyDate || addDays(existingRecall.revocationDate, 1)
}

/**
 * Get active recalls that should be considered for validation
 * Note: In this system, inactive recalls are deleted from the database rather than marked as inactive,
 * so all recalls returned by the API are considered active. This function exists for future extensibility
 * if recall status management changes.
 */
export function getRecallsForValidation(recalls: Recall[]): Recall[] {
  if (!recalls || recalls.length === 0) {
    return []
  }
  // This function is a placeholder for future filtering logic if recall status management changes
  return recalls
}
