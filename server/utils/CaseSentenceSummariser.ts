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
        outcomeUpdated: sentence.outcomeUpdated,
        countNumber: sentence.countNumber,
        convictionDate: sentence.convictionDate,
        terrorRelated: sentence.terrorRelated,
        isSentenced: sentence.isSentenced,
        sentenceServeType: sentence.sentenceServeType,
        consecutiveTo: sentence.consecutiveTo,
        sentenceType: sentence.sentenceType,
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
  const summarisedGroup: SummarisedSentenceGroup = {
    caseRefAndCourt: `Case ${courtCase.reference ?? 'held'} at ${courtCase.locationName || courtCase.location}${dateString}`,
    caseReference: courtCase.reference ?? 'Unknown',
    courtName: courtCase.locationName || courtCase.location || 'Unknown Court',
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
    }

    if (sentence.isRecallable === true && recallEligibility.recallRoute !== 'NOT_POSSIBLE') {
      summarisedGroup.hasEligibleSentences = true
      summarisedGroup.eligibleSentences.push(summarisedSentence)
    } else {
      summarisedGroup.hasIneligibleSentences = true
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
