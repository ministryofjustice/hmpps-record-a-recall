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
import { AdjustmentDto } from '../@types/adjustmentsApi/adjustmentsApiTypes'

export default function getJourneyDataFromRequest(req: FormWizard.Request): RecallJourneyData {
  const courtCases = getCourtCases(req)
  const courtCaseCount = courtCases ? courtCases.length : 0
  const groups = getSummarisedSentenceGroups(req)
  const sentenceIds = groups?.flatMap((g: SummarisedSentenceGroup) => g.eligibleSentences.flatMap(s => s.sentenceId))

  return {
    storedRecall: getStoredRecall(req),
    recallDate: getRecallDate(req),
    recallDateString: get<string>(req, sessionModelFields.RECALL_DATE),
    inPrisonAtRecall: inPrisonAtRecall(req),
    returnToCustodyDate: getReturnToCustodyDate(req),
    returnToCustodyDateString: get<string>(req, sessionModelFields.RTC_DATE),
    ual: getUal(req),
    ualText: getUalText(req),
    manualCaseSelection: isManualCaseSelection(req),
    recallType: getRecallType(getRecallTypeCode(req)),
    standardOnlyRecall: isStandardOnly(req),
    courtCaseCount,
    eligibleSentenceCount: getEligibleSentenceCount(req),
    sentenceIds,
    isEdit: req.sessionModel.get<boolean>(sessionModelFields.IS_EDIT),
  }
}

export type RecallJourneyData = {
  storedRecall?: Recall
  recallDate?: Date
  recallDateString?: string
  inPrisonAtRecall: boolean
  returnToCustodyDate?: Date
  returnToCustodyDateString?: string
  ual?: number
  ualText?: string
  manualCaseSelection: boolean
  recallType: RecallType
  courtCaseCount: number
  standardOnlyRecall?: boolean
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
  RECALL_DATE: 'recallDate',
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
  UAL_TO_SAVE: 'ualToSave',
}
export function getStoredRecall(req: FormWizard.Request): Recall {
  return get<Recall>(req, sessionModelFields.STORED_RECALL)
}
export function getUal(req: FormWizard.Request): number {
  return get<number>(req, sessionModelFields.UAL)
}

export function getRecallEligibility(req: FormWizard.Request) {
  return get<RecallEligibility>(req, sessionModelFields.RECALL_ELIGIBILITY)
}

export function getRecallOptions(req: FormWizard.Request) {
  return get<RecallEligibility>(req, sessionModelFields.RECALL_ELIGIBILITY)?.recallOptions
}

export function getUalText(req: FormWizard.Request): string {
  const ual = getUal(req)
  return ual !== undefined ? `${ual} day${ual === 1 ? '' : 's'}` : undefined
}

export function isStandardOnly(req: FormWizard.Request): boolean {
  return get<boolean>(req, sessionModelFields.STANDARD_ONLY) === true
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

export function getRecallDate(req: FormWizard.Request): Date {
  const recallDate = req.sessionModel.get<string>(sessionModelFields.RECALL_DATE)
  return recallDate ? new Date(recallDate) : null
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

export function getUalToSave(req: FormWizard.Request): UAL {
  return get<UAL>(req, sessionModelFields.UAL_TO_SAVE)
}

function get<T>(req: FormWizard.Request, key: string): T {
  return req.sessionModel.get<T>(key)
}
