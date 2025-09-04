import { Request } from 'express'
import { AdjustmentDto } from '../@types/adjustmentsApi/adjustmentsApiTypes'

export function getCrdsSentencesFromSession(req: Request): unknown[] {
  const sentences = req.session.formData?.crdsSentences
  return Array.isArray(sentences) ? sentences : []
}

export function getCourtCaseOptionsFromSession(req: Request): unknown[] {
  const courtCases = req.session.formData?.courtCases
  return Array.isArray(courtCases) ? courtCases : []
}

export function getExistingAdjustmentsFromSession(req: Request): AdjustmentDto[] {
  const adjustments = req.session.formData?.existingAdjustments
  return Array.isArray(adjustments) ? adjustments : []
}

export function getRevocationDateFromSession(req: Request): Date {
  const revocationDate = req.session.formData?.revocationDate
  return revocationDate ? new Date(revocationDate as string) : new Date()
}

export function getPrisonerFromSession(req: Request): unknown {
  return req.session.formData?.prisoner || {}
}

export function hasMultipleConflictingFromSession(req: Request): boolean {
  return req.session.formData?.hasMultipleConflicting === true
}

export function hasMultipleUALTypeRecallConflictingFromSession(req: Request): boolean {
  return req.session.formData?.hasMultipleOverlappingUalTypeRecall === true
}

export function isManualCaseSelectionFromSession(req: Request): boolean {
  return req.session.formData?.manualCaseSelection === true
}

export function getEligibleSentenceCountFromSession(req: Request): number {
  const count = req.session.formData?.eligibleSentenceCount
  return typeof count === 'number' ? count : 0
}

export function getAdjustmentsToConsiderForValidationFromSession(
  journeyData: Record<string, unknown>,
  allExistingAdjustments: AdjustmentDto[],
): AdjustmentDto[] {
  // For now, return all adjustments. In future, may filter based on journey data
  return allExistingAdjustments
}
