// eslint-disable-next-line import/no-unresolved
import { CourtCase, SentenceWithDpsUuid } from 'models'
import { CalculationBreakdown } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import {
  findConcurrentSentenceBreakdown,
  findConsecutiveSentenceBreakdown,
  SummarisedSentence,
  SummarisedSentenceGroup,
  GroupedSentences,
} from './sentenceUtils'
import getIndividualEligibility, { determineEligibilityOnRasSentenceType } from './RecallEligiblityCalculator'

export default function summariseSentencesGroups(
  groupedSentences: GroupedSentences[],
  breakdown: CalculationBreakdown,
  revocationDate: Date,
): SummarisedSentenceGroup[] {
  const summarisedSentenceGroups: SummarisedSentenceGroup[] = []
  groupedSentences.forEach(group => {
    const { caseReference, courtName, sentences: groupsSentences } = group

    const summarisedGroup: SummarisedSentenceGroup = {
      caseRefAndCourt: `${caseReference} at ${courtName}`, // Keep for backward compatibility
      caseReference,
      courtName,
      ineligibleSentences: [],
      hasIneligibleSentences: false,
      eligibleSentences: [],
      hasEligibleSentences: false,
      sentences: [],
    }
    groupsSentences.forEach((sentence: SentenceWithDpsUuid) => {
      const concurrentSentenceBreakdown = findConcurrentSentenceBreakdown(sentence, breakdown)
      const consecutiveSentenceBreakdown = breakdown.consecutiveSentence
      const consecutiveSentencePartBreakdown = findConsecutiveSentenceBreakdown(sentence, breakdown)

      const recallEligibility = getIndividualEligibility(
        sentence,
        concurrentSentenceBreakdown,
        consecutiveSentencePartBreakdown ? consecutiveSentenceBreakdown : null,
        revocationDate,
      )

      const summarisedSentence: SummarisedSentence = {
        sentenceId: sentence.sentenceUuid,
        recallEligibility,
        summary: [],
        offenceCode: sentence.offenceCode,
        offenceDescription: sentence.offenceDescription,
        unadjustedSled: sentence.unadjustedSled,
        sentenceLengthDays: sentence.sentenceLengthDays,
        offenceStartDate: sentence.offenceStartDate,
        offenceEndDate: sentence.offenceEndDate,
        outcome: sentence.outcome,
        fineAmount: sentence.fineAmount,
        outcomeUpdated: sentence.outcomeUpdated,
        countNumber: sentence.countNumber,
        terrorRelated: sentence.terrorRelated,
        isSentenced: sentence.isSentenced,
        sentenceServeType: sentence.sentenceServeType,
        consecutiveTo: sentence.consecutiveTo,
        sentenceType: sentence.sentenceType,
        sentenceDate: sentence.sentenceDate,
        periodLengths: sentence.periodLengths,
      }

      if (recallEligibility.recallRoute !== 'NOT_POSSIBLE') {
        summarisedGroup.hasEligibleSentences = true
        summarisedGroup.eligibleSentences.push(summarisedSentence)
      } else {
        summarisedGroup.hasIneligibleSentences = true
        summarisedGroup.ineligibleSentences.push(summarisedSentence)
      }
    })
    summarisedSentenceGroups.push(summarisedGroup)
  })
  return summarisedSentenceGroups
}

export function summariseCourtCase(courtCase: CourtCase, includeDate = true): SummarisedSentenceGroup {
  const dateString = includeDate ? ` on ${courtCase.date}` : ''
  const courtName = courtCase.locationName || 'Court name not available'
  const caseReference = courtCase.reference?.trim() || 'held'
  const caseRefAndCourt =
    courtName === 'Court name not available'
      ? 'Court name not available'
      : `Case ${caseReference} at ${courtName}${dateString}`

  const summarisedGroup: SummarisedSentenceGroup = {
    caseRefAndCourt,
    caseReference,
    courtName,
    ineligibleSentences: [],
    hasIneligibleSentences: false,
    eligibleSentences: [],
    sentences: [],
    hasEligibleSentences: false,
  }

  courtCase.sentences?.forEach(sentence => {
    if (!sentence) return

    const recallEligibility = determineEligibilityOnRasSentenceType(sentence)
    const summarisedSentence: SummarisedSentence = {
      sentenceId: sentence.sentenceUuid,
      recallEligibility,
      summary: [],
      offenceCode: sentence.offenceCode,
      offenceDescription: sentence.offenceDescription,
      offenceStartDate: sentence.offenceStartDate,
      offenceEndDate: sentence.offenceEndDate,
      countNumber: sentence.countNumber,
      sentenceType: sentence.sentenceType || sentence.sentenceLegacyData?.sentenceTypeDesc || 'N/A',
      sentenceDate: sentence.sentenceDate || 'N/A',
      sentenceServeType: sentence.sentenceServeType,
      fineAmount: sentence.fineAmount,
      consecutiveTo: sentence.consecutiveToChargeNumber,
      periodLengths: sentence.periodLengths,
      outcome: sentence.outcomeDescription || sentence.chargeLegacyData?.outcomeDescription || 'N/A',
    }

    if (sentence.isRecallable === true && recallEligibility.recallRoute !== 'NOT_POSSIBLE') {
      summarisedGroup.hasEligibleSentences = true
      summarisedGroup.eligibleSentences.push(summarisedSentence)
    } else {
      summarisedGroup.hasIneligibleSentences = true
       console.log(
    `[summariseSentencesGroups] Ineligible sentence ${sentence.sentenceUuid} has fineAmount:`,
    sentence.fineAmount
  )
  console.log('*****************************case sentence summariser')
      summarisedGroup.ineligibleSentences.push(summarisedSentence)
    }

    summarisedGroup.sentences.push(sentence)
  })

  return summarisedGroup
}

export function summariseRasCases(courtCases: CourtCase[]): SummarisedSentenceGroup[] {
  return courtCases
    .map(courtCase => summariseCourtCase(courtCase, false)) // RAS cases don't include date
    .filter(group => group.sentences.length > 0)
}
