import FormWizard from 'hmpo-form-wizard'
// eslint-disable-next-line import/no-unresolved
import { CourtCase, Recall, UAL } from 'models'
import { getRecallType, RecallType } from '../@types/recallTypes'
import { SummarisedSentenceGroup } from '../utils/sentenceUtils'
import {
  CalculatedReleaseDates,
  CalculationBreakdown,
  SentenceAndOffenceWithReleaseArrangements,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { RecallEligibility } from '../@types/recallEligibility'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import { AdjustmentDto, ConflictingAdjustments } from '../@types/adjustmentsApi/adjustmentsApiTypes'

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
  COURT_CASE_OPTIONS: 'CourtCaseOptions',
  COURT_CASES: 'courtCases',
  IN_PRISON_AT_RECALL: 'inPrisonAtRecall',
  RTC_DATE: 'returnToCustodyDate',
  REVOCATION_DATE: 'revocationDate',
  ELIGIBLE_SENTENCE_COUNT: 'eligibleSentenceCount',
  SUMMARISED_SENTENCES: 'summarisedSentenceGroups',
  IS_EDIT: 'isEdit',
  RETURN_TO: 'returnTo',
  JOURNEY_COMPLETE: 'journeyComplete',
  SENTENCES: 'sentences',
  TEMP_CALC: 'temporaryCalculation',
  BREAKDOWN: 'breakdown',
  GROUPED_SENTENCES: 'groupedSentences',
  CASES_WITH_ELIGIBLE_SENTENCES: 'casesWithEligibleSentences',
  RECALL_ELIGIBILITY: 'recallEligibility',
  RECALL_TYPE_MISMATCH: 'recallTypeMismatch',
  EXISTING_ADJUSTMENTS: 'existingAdjustments',
  INVALID_RECALL_TYPES: 'invalidRecallTypes',
  CONFLICTING_ADJUSTMENTS: 'conflictingAdjustments',
  UAL_TO_CREATE: 'ualToCreate',
  UAL_TO_EDIT: 'ualToEdit',
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

export function getCrdsSentences(req: FormWizard.Request): SentenceAndOffenceWithReleaseArrangements[] {
  return get<SentenceAndOffenceWithReleaseArrangements[]>(req, sessionModelFields.SENTENCES)
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

export function hasMultipleConflicting(req: FormWizard.Request): boolean {
  return req.sessionModel.get<boolean>(sessionModelFields.CONFLICTING_ADJUSTMENTS) === true
}

export function getConflictingAdjustments(req: FormWizard.Request): ConflictingAdjustments {
  return get<ConflictingAdjustments>(req, sessionModelFields.CONFLICTING_ADJUSTMENTS)
}

export function getUalToCreate(req: FormWizard.Request): UAL {
  return get<UAL>(req, sessionModelFields.UAL_TO_CREATE)
}

export function getUalToEdit(req: FormWizard.Request): UAL {
  return get<UAL>(req, sessionModelFields.UAL_TO_EDIT)
}

function get<T>(req: FormWizard.Request, key: string): T {
  return req.sessionModel.get<T>(key)
}
