import { ExtraQueryParams } from '../../@types/recallTypes'

export default class RecallJourneyUrls {
  static start = (nomsId: string, createOrEdit: 'edit' | 'create', recallId: string) => {
    return `/person/${nomsId}/recall/${createOrEdit}${recallId ? `/${recallId}` : ''}/start`
  }

  private static journeyUrl = (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => {
    return `/person/${nomsId}/recall/${createOrEdit}${recallId ? `/${recallId}` : ''}/${journeyId}`
  }

  static revocationDate = (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/revocation-date`
  }

  static returnToCustodyDate = (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/return-to-custody-date`
  }

  static decisionEndpoint = (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/recall-decision`
  }

  static reviewSentencesAutomatedJourney = (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/review-sentences`
  }

  static recallType = (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/recall-type`
  }

  static checkAnswers = (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/check-answers`
  }

  static recallConfirmation = (nomsId: string, createOrEdit: 'edit' | 'create', recallId: string) => {
    return `/person/${nomsId}/recall/${createOrEdit}/${recallId}/confirmed`
  }

  static confirmCancel = (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
    returnKey: string,
    caseIndex?: number,
  ) => {
    const query = new URLSearchParams({ returnKey })
    if (caseIndex !== undefined) query.set('caseIndex', caseIndex.toString())

    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/confirm-cancel?${query.toString()}`
  }

  static criticalValidationIntercept = (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/validation-intercept`
  }

  static conflictingAdjustmentsIntercept = (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/conflicting-adjustments`
  }

  static noRecallableSentencesFoundIntercept = (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/no-recallable-sentences-found`
  }

  // Manual routes
  static manualJourneyStart = (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/manual/start`
  }

  static manualSelectCases = (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
    caseIndex?: number,
  ) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/manual/select-court-cases${caseIndex ? `/${caseIndex}` : ''}`
  }

  static manualNoCasesSelected = (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/manual/no-cases-selected`
  }

  static manualCheckSentences = (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => {
    return `${RecallJourneyUrls.journeyUrl(nomsId, journeyId, createOrEdit, recallId)}/manual/check-sentences`
  }
}

export const urlMapByName = {
  start: (nomsId: string, createOrEdit: 'edit' | 'create', recallId: string) =>
    RecallJourneyUrls.start(nomsId, createOrEdit, recallId),
  revocationDate: (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) =>
    RecallJourneyUrls.revocationDate(nomsId, journeyId, createOrEdit, recallId),
  returnToCustodyDate: (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) =>
    RecallJourneyUrls.returnToCustodyDate(nomsId, journeyId, createOrEdit, recallId),
  decisionEndpoint: (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) =>
    RecallJourneyUrls.decisionEndpoint(nomsId, journeyId, createOrEdit, recallId),
  reviewSentencesAutomatedJourney: (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => RecallJourneyUrls.reviewSentencesAutomatedJourney(nomsId, journeyId, createOrEdit, recallId),
  recallType: (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) =>
    RecallJourneyUrls.recallType(nomsId, journeyId, createOrEdit, recallId),
  checkAnswers: (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) =>
    RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId),
  criticalValidationIntercept: (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) =>
    RecallJourneyUrls.criticalValidationIntercept(nomsId, journeyId, createOrEdit, recallId),
  conflictingAdjustmentsIntercept: (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => RecallJourneyUrls.conflictingAdjustmentsIntercept(nomsId, journeyId, createOrEdit, recallId),
  noRecallableSentencesFoundIntercept: (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) => RecallJourneyUrls.noRecallableSentencesFoundIntercept(nomsId, journeyId, createOrEdit, recallId),
  manualJourneyStart: (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) =>
    RecallJourneyUrls.manualJourneyStart(nomsId, journeyId, createOrEdit, recallId),
  manualSelectCases: (
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
    extras?: ExtraQueryParams,
  ) => RecallJourneyUrls.manualSelectCases(nomsId, journeyId, createOrEdit, recallId, extras?.caseIndex),
  manualCheckSentences: (nomsId: string, journeyId: string, createOrEdit: 'edit' | 'create', recallId: string) =>
    RecallJourneyUrls.manualCheckSentences(nomsId, journeyId, createOrEdit, recallId),
} as const

export type ReturnKey = keyof typeof urlMapByName

export const buildReturnUrlFromKey = (
  key: string,
  nomsId: string,
  journeyId: string,
  createOrEdit: 'edit' | 'create',
  recallId: string,
  extraParams: ExtraQueryParams = {},
): string => {
  const createUrlFunction = urlMapByName[key as ReturnKey] ?? urlMapByName.start
  return createUrlFunction.length === 5
    ? createUrlFunction(nomsId, journeyId, createOrEdit, recallId, extraParams)
    : createUrlFunction(nomsId, journeyId, createOrEdit, recallId)
}
