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
    const summarisedGroup: SummarisedSentenceGroup = {
      caseRefAndCourt: caseRef,
      ineligibleSentences: [],
      hasIneligibleSentences: false,
      eligibleSentences: [],
      hasEligibleSentences: false,
      sentences: [],
    }

    summarisedGroup.caseRefAndCourt = caseRef
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

      if (recallEligibility.recallRoute !== 'NOT_POSSIBLE') {
        summarisedGroup.hasEligibleSentences = true
        summarisedGroup.eligibleSentences.push(sentence)
      } else {
        summarisedGroup.hasIneligibleSentences = true
        summarisedGroup.ineligibleSentences.push(sentence)
      }
    })
    summarisedSentenceGroups.push(summarisedGroup)
  })
  return summarisedSentenceGroups
}

function summariseCase(courtCase: CourtCase): SummarisedSentenceGroup {
  const summarisedGroup: SummarisedSentenceGroup = {
    caseRefAndCourt: `Case ${courtCase.reference ?? 'held'} at ${courtCase.locationName || courtCase.location} on ${courtCase.date}`,
    ineligibleSentences: [],
    hasIneligibleSentences: false,
    eligibleSentences: [],
    sentences: [],
    hasEligibleSentences: false,
  }

  courtCase.sentences.forEach(s => {
    summarisedGroup.hasEligibleSentences = true
    const recallEligibility = determineEligibilityOnRasSentenceType(s.sentence)
    const summary = compact([])
    const summarisedSentence: SummarisedSentence = {
      sentenceId: s.sentence.sentenceUuid,
      recallEligibility,
      summary,
      offenceCode: s.sentence.offenceCode,
      offenceDescription: s.sentence.offenceDescription,
    }

    summarisedGroup.eligibleSentences.push(summarisedSentence)
    summarisedGroup.sentences.push(s)
  })

  return summarisedGroup
}

export function summariseRasCases(courtCases: CourtCase[]): SummarisedSentenceGroup[] {
  const summarisedCases: SummarisedSentenceGroup[] = []
  courtCases.forEach(c => summarisedCases.push(summariseCase(c)))
  return summarisedCases
}
