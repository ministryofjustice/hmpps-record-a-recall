import { compact } from 'lodash'
// eslint-disable-next-line import/no-unresolved
import { CourtCase, SentenceWithDpsUuid } from 'models'
import { CalculationBreakdown } from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import {
  findConcurrentSentenceBreakdown,
  findConsecutiveSentenceBreakdown,
  SummarisedSentence,
  SummarisedSentenceGroup,
} from './sentenceUtils'
import getIndividualEligibility, { determineEligibilityOnRasSentenceType } from './RecallEligiblityCalculator'

export default function summariseSentencesGroups(
  groupedSentences: Record<string, SentenceWithDpsUuid[]>,
  breakdown: CalculationBreakdown,
  revocationDate: Date,
): SummarisedSentenceGroup[] {
  const summarisedSentenceGroups: SummarisedSentenceGroup[] = []
  Object.keys(groupedSentences).forEach(caseRef => {
    const groupsSentences = groupedSentences[caseRef]

    // Extract case reference and court name from the grouped key
    // Format: "{reference} at {court}"
    const parts = caseRef.match(/^(.+?)\s+at\s+(.+)$/)
    const caseReference = parts?.[1] || 'Unknown'
    const courtName = parts?.[2] || 'Unknown Court'

    const summarisedGroup: SummarisedSentenceGroup = {
      caseRefAndCourt: caseRef,
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

function summariseCase(courtCase: CourtCase): SummarisedSentenceGroup {
  const summarisedGroup: SummarisedSentenceGroup = {
    caseRefAndCourt: `Case ${courtCase.reference ?? 'held'} at ${courtCase.locationName || courtCase.location} on ${courtCase.date}`,
    caseReference: courtCase.reference ?? 'Unknown',
    courtName: courtCase.locationName || courtCase.location || 'Unknown Court',
    ineligibleSentences: [],
    hasIneligibleSentences: false,
    eligibleSentences: [],
    sentences: [],
    hasEligibleSentences: false,
  }

  courtCase.sentences.forEach(sentence => {
    if (!sentence) {
      return
    }
    summarisedGroup.hasEligibleSentences = true
    const recallEligibility = determineEligibilityOnRasSentenceType(sentence)
    const summary = compact([])
    const summarisedSentence: SummarisedSentence = {
      sentenceId: sentence.sentenceUuid,
      recallEligibility,
      summary,
      offenceCode: sentence.offenceCode,
      offenceDescription: sentence.offenceDescription,
    }

    summarisedGroup.eligibleSentences.push(summarisedSentence)
    summarisedGroup.sentences.push(sentence)
  })

  return summarisedGroup
}

export function summariseRasCases(courtCases: CourtCase[]): SummarisedSentenceGroup[] {
  const summarisedCases: SummarisedSentenceGroup[] = []
  courtCases.forEach(c => summarisedCases.push(summariseCase(c)))
  return summarisedCases
}
