import { DecoratedCourtCase, RecallJourney } from '../../@types/journeys'
import { AutomatedCalculationData } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

/* eslint-disable no-param-reassign -- these helpers intentionally mutate the session journey object */

export function setAutomatedCalculationData(
  journey: RecallJourney,
  recallableCourtCases: DecoratedCourtCase[],
  automatedCalculationData: AutomatedCalculationData,
): void {
  journey.sentenceIds = recallableCourtCases
    .flatMap(courtCase => [...courtCase.recallableSentences, ...courtCase.nonRecallableSentences])
    .map(sentence => sentence.sentenceUuid)
    .filter(uuid => automatedCalculationData.recallableSentences.some(sentence => sentence.uuid === uuid))
  journey.calculationRequestId = automatedCalculationData.calculationRequestId
  journey.automatedCalculationData = automatedCalculationData
}

export function clearAutomatedCalculationData(journey: RecallJourney): void {
  delete journey.calculationRequestId
  delete journey.automatedCalculationData
  delete journey.sentenceIds
}

export function resetCheckingAnswers(journey: RecallJourney): void {
  journey.isCheckingAnswers = false
}
