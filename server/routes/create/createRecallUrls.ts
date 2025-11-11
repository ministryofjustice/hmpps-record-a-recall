import { ExtraQueryParams } from '../../@types/recallTypes'

export default class CreateRecallUrls {
  static start = (nomsId: string) => {
    return `/person/${nomsId}/recall/create/start`
  }

  static revocationDate = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/revocation-date`
  }

  static returnToCustodyDate = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/return-to-custody-date`
  }

  static decisionEndpoint = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/recall-decision`
  }

  static reviewSentencesAutomatedJourney = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/review-sentences`
  }

  static recallType = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/recall-type`
  }

  static checkAnswers = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/check-answers`
  }

  static recallCreatedConfirmation = (nomsId: string, recallId: string) => {
    return `/person/${nomsId}/recall/create/${recallId}/confirmed`
  }

  static confirmCancel = (nomsId: string, journeyId: string, returnKey: string, caseIndex?: number) => {
    const query = new URLSearchParams({ returnKey })
    if (caseIndex !== undefined) query.set('caseIndex', caseIndex.toString())

    return `/person/${nomsId}/recall/create/${journeyId}/confirm-cancel?${query.toString()}`
  }

  static criticalValidationIntercept = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/validation-intercept`
  }

  static conflictingAdjustmentsIntercept = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/conflicting-adjustments`
  }

  static noRecallableSentencesFoundIntercept = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/no-recallable-sentences-found`
  }

  // Manual routes
  static manualJourneyStart = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/manual/start`
  }

  static manualSelectCases = (nomsId: string, journeyId: string, caseIndex?: number) => {
    return caseIndex !== undefined
      ? `/person/${nomsId}/recall/create/${journeyId}/manual/select-court-cases/${caseIndex}`
      : `/person/${nomsId}/recall/create/${journeyId}/manual/select-court-cases`
  }

  static manualCheckSentences = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/manual/check-sentences`
  }

  static manualSelectRecallType = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/manual/select-recall-type`
  }

  static manualCheckAnswers = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/manual/check-answers`
  }
}

export const urlMapByName = {
  start: (nomsId: string) => CreateRecallUrls.start(nomsId),
  revocationDate: (nomsId: string, journeyId: string) => CreateRecallUrls.revocationDate(nomsId, journeyId),
  returnToCustodyDate: (nomsId: string, journeyId: string) => CreateRecallUrls.returnToCustodyDate(nomsId, journeyId),
  decisionEndpoint: (nomsId: string, journeyId: string) => CreateRecallUrls.decisionEndpoint(nomsId, journeyId),
  reviewSentencesAutomatedJourney: (nomsId: string, journeyId: string) =>
    CreateRecallUrls.reviewSentencesAutomatedJourney(nomsId, journeyId),
  recallType: (nomsId: string, journeyId: string) => CreateRecallUrls.recallType(nomsId, journeyId),
  checkAnswers: (nomsId: string, journeyId: string) => CreateRecallUrls.checkAnswers(nomsId, journeyId),
  criticalValidationIntercept: (nomsId: string, journeyId: string) =>
    CreateRecallUrls.criticalValidationIntercept(nomsId, journeyId),
  conflictingAdjustmentsIntercept: (nomsId: string, journeyId: string) =>
    CreateRecallUrls.conflictingAdjustmentsIntercept(nomsId, journeyId),
  noRecallableSentencesFoundIntercept: (nomsId: string, journeyId: string) =>
    CreateRecallUrls.noRecallableSentencesFoundIntercept(nomsId, journeyId),
  manualJourneyStart: (nomsId: string, journeyId: string) => CreateRecallUrls.manualJourneyStart(nomsId, journeyId),
  manualSelectCases: (nomsId: string, journeyId: string, extras?: ExtraQueryParams) =>
    CreateRecallUrls.manualSelectCases(nomsId, journeyId, extras?.caseIndex),
  manualCheckSentences: (nomsId: string, journeyId: string) => CreateRecallUrls.manualCheckSentences(nomsId, journeyId),
  manualSelectRecallType: (nomsId: string, journeyId: string) =>
    CreateRecallUrls.manualSelectRecallType(nomsId, journeyId),
  manualCheckAnswers: (nomsId: string, journeyId: string) => CreateRecallUrls.manualCheckAnswers(nomsId, journeyId),
} as const

export type ReturnKey = keyof typeof urlMapByName

export const buildReturnUrlFromKey = (
  key: string,
  nomsId: string,
  journeyId: string,
  extraParams: ExtraQueryParams = {},
): string => {
  const createUrlFunction = urlMapByName[key as ReturnKey] ?? urlMapByName.start
  return createUrlFunction.length === 3
    ? createUrlFunction(nomsId, journeyId, extraParams)
    : createUrlFunction(nomsId, journeyId)
}
