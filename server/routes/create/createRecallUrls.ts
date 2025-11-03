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

  static confirmCancel = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/confirm-cancel`
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

  static manualCheckSentences = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/manual/check-sentences`
  }
}
