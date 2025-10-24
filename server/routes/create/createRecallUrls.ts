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

  static reviewSentencesAutomatedJourney = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/review-sentences`
  }

  static selectCasesManualJourney = (nomsId: string, journeyId: string) => {
    return `/person/${nomsId}/recall/create/${journeyId}/select-cases`
  }
}
