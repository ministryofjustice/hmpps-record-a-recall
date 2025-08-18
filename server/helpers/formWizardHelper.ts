import FormWizard from 'hmpo-form-wizard'
// eslint-disable-next-line import/no-unresolved
import { CourtCase, Recall, SentenceWithDpsUuid, UAL } from 'models'
import { getRecallType, RecallType } from '../@types/recallTypes'
import { SummarisedSentenceGroup } from '../utils/sentenceUtils'
import {
  CalculatedReleaseDates,
  CalculationBreakdown,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { RecallEligibility } from '../@types/recallEligibility'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import { AdjustmentDto, ConflictingAdjustments } from '../@types/adjustmentsApi/adjustmentsApiTypes'
import { DpsSentenceIds } from '../@types/nomisMappingApi/nomisMappingApiTypes'

export default function getJourneyDataFromRequest(req: FormWizard.Request): RecallJourneyData {
  const courtCases = getCourtCases(req)
  const courtCaseCount = courtCases ? courtCases.length : 0
  const groups = getSummarisedSentenceGroups(req)
  const sentenceIds = groups?.flatMap((g: SummarisedSentenceGroup) => g.eligibleSentences.flatMap(s => s.sentenceId))

  return {
    storedRecall: getStoredRecall(req),
    revocationDate: getRevocationDate(req),
    revDateString: get<string>(req, sessionModelFields.REVOCATION_DATE),
    inPrisonAtRecall: inPrisonAtRecall(req),
    returnToCustodyDate: getReturnToCustodyDate(req),
    returnToCustodyDateString: get<string>(req, sessionModelFields.RTC_DATE),
    ual: getUal(req),
    ualText: getUalText(req),
    manualCaseSelection: isManualCaseSelection(req),
    recallType: getRecallType(getRecallTypeCode(req)),
    courtCaseCount,
    eligibleSentenceCount: getEligibleSentenceCount(req),
    sentenceIds,
    isEdit: req.sessionModel.get<boolean>(sessionModelFields.IS_EDIT),
    // hasMultipleOverlappingUALTypeRecall: hasMultipleUALTypeRecallConflicting(req)
  }
}

export type RecallJourneyData = {
  storedRecall?: Recall
  revocationDate?: Date
  revDateString?: string
  inPrisonAtRecall: boolean
  returnToCustodyDate?: Date
  returnToCustodyDateString?: string
  ual?: number
  ualText?: string
  manualCaseSelection: boolean
  recallType: RecallType
  courtCaseCount: number
  eligibleSentenceCount: number
  sentenceIds?: string[]
  isEdit: boolean
  // hasMultipleOverlappingUALTypeRecall: boolean
}

export const sessionModelFields = {
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
  COURT_CASE_OPTIONS: 'courtCaseOptions',
  COURT_CASES: 'courtCases',
  IN_PRISON_AT_RECALL: 'inPrisonAtRecall',
  RTC_DATE: 'returnToCustodyDate',
  REVOCATION_DATE: 'revocationDate',
  ELIGIBLE_SENTENCE_COUNT: 'eligibleSentenceCount',
  SUMMARISED_SENTENCES: 'summarisedSentenceGroups',
  IS_EDIT: 'isEdit',
  RETURN_TO: 'returnTo',
  JOURNEY_COMPLETE: 'journeyComplete',
  SENTENCES: 'crdsSentences',
  RAS_SENTENCES: 'rasSentences',
  TEMP_CALC: 'temporaryCalculation',
  BREAKDOWN: 'breakdown',
  GROUPED_SENTENCES: 'groupedSentences',
  CASES_WITH_ELIGIBLE_SENTENCES: 'casesWithEligibleSentences',
  RECALL_ELIGIBILITY: 'recallEligibility',
  RECALL_TYPE_MISMATCH: 'recallTypeMismatch',
  EXISTING_ADJUSTMENTS: 'existingAdjustments',
  INVALID_RECALL_TYPES: 'invalidRecallTypes',
  CONFLICTING_ADJUSTMENTS: 'conflictingAdjustments',
  RELEVANT_ADJUSTMENTS: 'relevantAdjustment',
  UAL_TO_CREATE: 'ualToCreate',
  UAL_TO_EDIT: 'ualToEdit',
  INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS: 'incompatibleTypesAndMultipleConflictingAdjustments',
  // incompatible (includes multiple) adjustment type of non recall ual
  HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL: 'hasMultipleOverlappingUalTypeRecall',
  DPS_SENTENCE_IDS: 'dpsSentenceIds',
  REVIEWABLE_COURT_CASES: 'reviewableCourtCases',
  CURRENT_CASE_INDEX: 'currentCaseIndex',
  MANUAL_RECALL_DECISIONS: 'manualRecallDecisions',
  UNKNOWN_SENTENCES_TO_UPDATE: 'unknownSentencesToUpdate',
  UPDATED_SENTENCE_TYPES: 'updatedSentences',
  SELECTED_COURT_CASE_UUID: 'selectedCourtCaseUuid',
  BULK_UPDATE_MODE: 'bulkUpdateMode',
  SENTENCES_IN_CURRENT_CASE: 'sentencesInCurrentCase',
  CURRENT_SENTENCE_INDEX: 'currentSentenceIndex',
}
export function getStoredRecall(req: FormWizard.Request): Recall {
  return get<Recall>(req, sessionModelFields.STORED_RECALL)
}
export function getUal(req: FormWizard.Request): number {
  return get<number>(req, sessionModelFields.UAL)
}

export function getInvalidRecallTypes(req: FormWizard.Request) {
  return get<RecallType[]>(req, sessionModelFields.INVALID_RECALL_TYPES) || []
}

export function getRecallRoute(req: FormWizard.Request) {
  return get<RecallEligibility>(req, sessionModelFields.RECALL_ELIGIBILITY)?.recallRoute
}

export function getUalText(req: FormWizard.Request): string {
  const ual = getUal(req)
  return ual !== undefined ? `${ual} day${ual === 1 ? '' : 's'}` : undefined
}

export function isRecallTypeMismatch(req: FormWizard.Request): boolean {
  return get<boolean>(req, sessionModelFields.RECALL_TYPE_MISMATCH) === true
}

export function getRecallTypeCode(req: FormWizard.Request): string {
  return get<string>(req, sessionModelFields.RECALL_TYPE)
}

export function isManualCaseSelection(req: FormWizard.Request): boolean {
  return req.sessionModel.get<boolean>(sessionModelFields.MANUAL_CASE_SELECTION) === true
}

export function getCourtCases(req: FormWizard.Request): string[] {
  return get<string[]>(req, sessionModelFields.COURT_CASES)
}

export function inPrisonAtRecall(req: FormWizard.Request): boolean {
  return get<boolean>(req, sessionModelFields.IN_PRISON_AT_RECALL)
}

export function getReturnToCustodyDate(req: FormWizard.Request): Date {
  const returnToCustodyDate = req.sessionModel.get<string>(sessionModelFields.RTC_DATE)
  return returnToCustodyDate ? new Date(returnToCustodyDate) : null
}

export function getRevocationDate(req: FormWizard.Request): Date {
  const revocationDate = req.sessionModel.get<string>(sessionModelFields.REVOCATION_DATE)
  return revocationDate ? new Date(revocationDate) : null
}

export function getEligibleSentenceCount(req: FormWizard.Request): number {
  return get<number>(req, sessionModelFields.ELIGIBLE_SENTENCE_COUNT) || 0
}

export function getSummarisedSentenceGroups(req: FormWizard.Request): SummarisedSentenceGroup[] {
  return get<SummarisedSentenceGroup[]>(req, sessionModelFields.SUMMARISED_SENTENCES)
}

export function getTemporaryCalc(req: FormWizard.Request): CalculatedReleaseDates {
  return get<CalculatedReleaseDates>(req, sessionModelFields.TEMP_CALC)
}

export function getBreakdown(req: FormWizard.Request): CalculationBreakdown {
  return get<CalculationBreakdown>(req, sessionModelFields.BREAKDOWN)
}

export function getCrdsSentences(req: FormWizard.Request): SentenceWithDpsUuid[] {
  return get<SentenceWithDpsUuid[]>(req, sessionModelFields.SENTENCES)
}

export function getCourtCaseOptions(req: FormWizard.Request): CourtCase[] {
  return get<CourtCase[]>(req, sessionModelFields.COURT_CASE_OPTIONS)
}

export function getPrisoner(req: FormWizard.Request): PrisonerSearchApiPrisoner {
  return get<PrisonerSearchApiPrisoner>(req, sessionModelFields.PRISONER)
}

export function getExistingAdjustments(req: FormWizard.Request): AdjustmentDto[] {
  return get<AdjustmentDto[]>(req, sessionModelFields.EXISTING_ADJUSTMENTS)
}

export function getAdjustmentsToConsiderForValidation(
  journeyData: RecallJourneyData,
  allExistingAdjustments: AdjustmentDto[],
): AdjustmentDto[] {
  const { isEdit, storedRecall } = journeyData
  const currentRecallId = storedRecall?.recallId

  if (!allExistingAdjustments) {
    return []
  }

  return allExistingAdjustments.filter((adjustment: AdjustmentDto) => {
    if (
      isEdit &&
      currentRecallId &&
      adjustment.recallId === currentRecallId &&
      adjustment.adjustmentType === 'UNLAWFULLY_AT_LARGE'
    ) {
      return false // Ignore UAL linked to the current recall being edited
    }
    return true // Include all other adjustments
  })
}

export function getDpsSentenceId(req: FormWizard.Request): DpsSentenceIds {
  return get<DpsSentenceIds>(req, sessionModelFields.DPS_SENTENCE_IDS)
}

export function hasMultipleConflicting(req: FormWizard.Request): boolean {
  return (
    req.sessionModel.get<boolean>(sessionModelFields.INCOMPATIBLE_TYPES_AND_MULTIPLE_CONFLICTING_ADJUSTMENTS) === true
  )
}

export function hasMultipleUALTypeRecallConflicting(req: FormWizard.Request): boolean {
  return req.sessionModel.get<boolean>(sessionModelFields.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL) === true
}

export function getConflictingAdjustments(req: FormWizard.Request): ConflictingAdjustments {
  return get<ConflictingAdjustments>(req, sessionModelFields.CONFLICTING_ADJUSTMENTS)
}

export function getRelevantAdjustment(req: FormWizard.Request): AdjustmentDto {
  return get<AdjustmentDto>(req, sessionModelFields.RELEVANT_ADJUSTMENTS)
}

export function getUalToCreate(req: FormWizard.Request): UAL {
  return get<UAL>(req, sessionModelFields.UAL_TO_CREATE)
}

export function getUalToEdit(req: FormWizard.Request): UAL {
  return get<UAL>(req, sessionModelFields.UAL_TO_EDIT)
}

export function getEntrypoint(req: FormWizard.Request): string {
  return get<string>(req, sessionModelFields.ENTRYPOINT)
}

function get<T>(req: FormWizard.Request, key: string): T {
  return req.sessionModel.get<T>(key)
}
