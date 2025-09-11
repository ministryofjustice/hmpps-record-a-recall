import type { Recall, CourtCase, UAL, SentenceWithDpsUuid } from 'models'
import { RecallType } from '../@types/recallTypes'
import { SummarisedSentenceGroup } from '../utils/sentenceUtils'
import {
  CalculatedReleaseDates,
  CalculationBreakdown,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { RecallEligibility } from '../@types/recallEligibility'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import { AdjustmentDto, ConflictingAdjustments } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import { DpsSentenceIds } from '../@types/nomisMappingApi/nomisMappingApiTypes'

/**
 * Core journey data used throughout the recall flow
 */
export interface RecallJourneyData {
  storedRecall?: Recall
  revocationDate?: Date
  revDateString?: string
  inPrisonAtRecall: boolean
  returnToCustodyDate?: Date
  returnToCustodyDateString?: string
  ual?: number
  ualText?: string
  manualCaseSelection: boolean
  recallType?: RecallType
  courtCaseCount: number
  eligibleSentenceCount: number
  sentenceIds?: string[]
  isEdit: boolean
}

/**
 * Complete session data structure with all possible fields
 * Maps to SESSION_KEYS in SessionManager
 */
export interface RecallSessionData {
  // Entry and navigation
  entrypoint?: string
  returnTo?: string
  journeyComplete?: boolean
  isEdit?: boolean

  // Validation and errors
  crdsErrors?: string[]
  happyPathFailReasons?: string[]
  errors?: Record<string, string>
  formResponses?: Record<string, string>

  // Prisoner data
  prisoner?: PrisonerSearchApiPrisoner
  nomisId?: string

  // Recall core data
  recallId?: string
  storedRecall?: Recall
  recallType?: string
  standardOnlyRecall?: boolean
  recallTypeMismatch?: boolean
  invalidRecallTypes?: RecallType[]
  recallEligibility?: RecallEligibility

  // Dates
  revocationDate?: string
  rtcDate?: string
  inPrisonAtRecall?: boolean

  // UAL (Unlawfully At Large) data
  ual?: number
  ualToCreate?: UAL
  ualToEdit?: UAL

  // Court cases and sentences
  courtCaseOptions?: CourtCase[]
  courtCases?: string[]
  selectedCourtCaseUuid?: string
  reviewableCourtCases?: CourtCase[]
  currentCaseIndex?: number
  casesWithEligibleSentences?: string[]

  // Sentence data
  eligibleSentenceCount?: number
  summarisedSentences?: SummarisedSentenceGroup[]
  sentences?: SentenceWithDpsUuid[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rasSentences?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  groupedSentences?: any[]
  dpsSentenceIds?: DpsSentenceIds
  sentenceGroups?: SummarisedSentenceGroup[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sentencesInCurrentCase?: any[]
  currentSentenceIndex?: number
  activeSentenceChoice?: string

  // Manual recall process
  manualCaseSelection?: boolean
  manualRecallDecisions?: Record<string, boolean | string>

  // Sentence type updates
  unknownSentencesToUpdate?: string[]
  updatedSentences?: Record<string, string>
  bulkUpdateMode?: boolean

  // Calculation data
  temporaryCalculation?: CalculatedReleaseDates
  breakdown?: CalculationBreakdown

  // Adjustments and conflicts
  existingAdjustments?: AdjustmentDto[]
  conflictingAdjustments?: ConflictingAdjustments
  relevantAdjustment?: AdjustmentDto
  incompatibleTypesAndMultipleConflictingAdjustments?: boolean
  hasMultipleOverlappingUalTypeRecall?: boolean
}

/**
 * Type guard to check if an object is RecallSessionData
 */
export function isRecallSessionData(obj: unknown): obj is RecallSessionData {
  return typeof obj === 'object' && obj !== null
}

/**
 * Type guard to check if an object is RecallJourneyData
 */
export function isRecallJourneyData(obj: unknown): obj is RecallJourneyData {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }
  const data = obj as RecallJourneyData
  return (
    typeof data.inPrisonAtRecall === 'boolean' &&
    typeof data.manualCaseSelection === 'boolean' &&
    typeof data.courtCaseCount === 'number' &&
    typeof data.eligibleSentenceCount === 'number' &&
    typeof data.isEdit === 'boolean'
  )
}
