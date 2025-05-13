import { compact } from 'lodash'
// eslint-disable-next-line import/no-unresolved
import { CourtCase, SentenceWithDpsUuid, Term } from 'models'
import {
  CalculationBreakdown,
  ConcurrentSentenceBreakdown,
  ConsecutiveSentenceBreakdown,
  ConsecutiveSentencePart,
  Offence,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import toSummaryListRow from '../helpers/componentHelper'
import { format8DigitDate } from '../formatters/formatDate'
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
    }

    summarisedGroup.caseRefAndCourt = caseRef
    groupsSentences.forEach((sentence: SentenceWithDpsUuid) => {
      const concurrentSentenceBreakdown = findConcurrentSentenceBreakdown(sentence, breakdown)
      const consecutiveSentenceBreakdown = breakdown.consecutiveSentence
      const consecutiveSentencePartBreakdown = findConsecutiveSentenceBreakdown(sentence, breakdown)

      const { offence } = sentence

      const recallEligibility = getIndividualEligibility(
        sentence,
        concurrentSentenceBreakdown,
        consecutiveSentencePartBreakdown ? consecutiveSentenceBreakdown : null,
        revocationDate,
      )

      const forthConsConc = forthwithConsecutiveConcurrent(
        concurrentSentenceBreakdown,
        consecutiveSentencePartBreakdown,
      )

      const sentenceLengthDays =
        concurrentSentenceBreakdown?.sentenceLengthDays || consecutiveSentencePartBreakdown?.sentenceLengthDays
      const aggregateSentenceLengthDays = consecutiveSentenceBreakdown?.sentenceLengthDays

      const unadjustedSled = getDate(
        concurrentSentenceBreakdown,
        consecutiveSentenceBreakdown,
        consecutiveSentencePartBreakdown,
        'SLED',
      )?.unadjusted

      const unadjustedLed = getDate(
        concurrentSentenceBreakdown,
        consecutiveSentenceBreakdown,
        consecutiveSentencePartBreakdown,
        'LED',
      )?.unadjusted

      const summary = compact([
        toSummaryListRow('Committed on', stringifyOffenceDate(offence)),
        toSummaryListRow('Sentence date', format8DigitDate(sentence.sentenceDate)),
        toSummaryListRow('Sentence type', sentence.sentenceTypeDescription),
        toSummaryListRow('Custodial term', getCustodialTerm(sentence.terms)),
        toSummaryListRow('Licence period', getLicenceTerm(sentence.terms)),
        toSummaryListRow('Case Sequence', `${sentence.caseSequence}`),
        toSummaryListRow('Line Sequence', `${sentence.lineSequence}`),
        toSummaryListRow('Consecutive or concurrent', forthConsConc),
        toSummaryListRow('Unadjusted SLED', unadjustedSled),
        toSummaryListRow('Unadjusted LED', unadjustedLed),
        toSummaryListRow(
          consecutiveSentencePartBreakdown ? 'Aggregate sentence length' : 'Sentence length',
          consecutiveSentencePartBreakdown ? `${aggregateSentenceLengthDays}` : `${sentenceLengthDays}`,
        ),
        toSummaryListRow(
          'Invalid recall types',
          recallEligibility.ineligibleRecallTypes?.map(t => t.description).join(', '),
        ),
        toSummaryListRow('Recall Options reason', recallEligibility.description),
      ])

      const thisSummarisedSentence: SummarisedSentence = {
        sentenceId: sentence.dpsSentenceUuid,
        recallEligibility,
        summary,
        offenceCode: sentence.offence.offenceCode,
        offenceDescription: sentence.offence.offenceDescription,
        unadjustedSled: unadjustedSled || unadjustedLed,
        sentenceLengthDays: consecutiveSentencePartBreakdown ? aggregateSentenceLengthDays : sentenceLengthDays,
      }

      if (recallEligibility.recallRoute !== 'NOT_POSSIBLE') {
        summarisedGroup.hasEligibleSentences = true
        summarisedGroup.eligibleSentences.push(thisSummarisedSentence)
      } else {
        summarisedGroup.hasIneligibleSentences = true
        summarisedGroup.ineligibleSentences.push(thisSummarisedSentence)
      }
    })
    summarisedSentenceGroups.push(summarisedGroup)
  })
  return summarisedSentenceGroups
}

function forthwithConsecutiveConcurrent(
  concBreakdown: ConcurrentSentenceBreakdown,
  consPartBreakdown: ConsecutiveSentencePart,
): string {
  if (concBreakdown) {
    return 'Concurrent'
  }
  if (consPartBreakdown) {
    if (consPartBreakdown.consecutiveToLineSequence && consPartBreakdown.consecutiveToCaseSequence) {
      return `Consecutive to case ${consPartBreakdown.consecutiveToCaseSequence}, line ${consPartBreakdown.consecutiveToLineSequence}`
    }
    return 'Forthwith'
  }

  return 'Unknown'
}

function getCustodialTerm(terms: Term[]): string {
  return getTerm(terms, 'IMP')
}

function getLicenceTerm(terms: Term[]): string {
  return getTerm(terms, 'LIC')
}

function getTerm(terms: Term[], type: string): string {
  const term = terms?.find(t => t.code === type)

  return stringifyTerm(term)
}

function stringifyTerm(term: Term): string {
  return term ? `${term.years} years ${term.months} months ${term.weeks} weeks ${term.days} days` : undefined
}

function stringifyOffenceDate(offence: Offence) {
  return offence.offenceEndDate
    ? `${format8DigitDate(offence.offenceStartDate)} to ${format8DigitDate(offence.offenceEndDate)}`
    : format8DigitDate(offence.offenceStartDate)
}

function getDate(
  concBreakdown: ConcurrentSentenceBreakdown,
  consBreakdown: ConsecutiveSentenceBreakdown,
  consPartBreakdown: ConsecutiveSentencePart,
  dateType: string,
) {
  if (concBreakdown) {
    return concBreakdown.dates[dateType]
  }
  if (consPartBreakdown) {
    return consBreakdown.dates[dateType]
  }
  return null
}

export function summariseRasCases(courtsCases: CourtCase[]): SummarisedSentenceGroup[] {
  const summarisedCases: SummarisedSentenceGroup[] = []
  courtsCases.forEach(c => summarisedCases.push(summariseCase(c)))
  return summarisedCases
}

function summariseCase(courtCase: CourtCase): SummarisedSentenceGroup {
  const summarisedGroup: SummarisedSentenceGroup = {
    caseRefAndCourt: `Case ${courtCase.reference ?? 'held'} at ${courtCase.locationName || courtCase.location} on ${courtCase.date}`,
    ineligibleSentences: [],
    hasIneligibleSentences: false,
    eligibleSentences: [],
    hasEligibleSentences: false,
  }

  courtCase.sentences.forEach(s => {
    summarisedGroup.hasEligibleSentences = true
    const recallEligibility = determineEligibilityOnRasSentenceType(s)
    const summary = compact([
      toSummaryListRow('Committed on', s.offenceDate),
      toSummaryListRow('Sentence date', s.convictionDate),
      toSummaryListRow('Sentence type', s.sentenceType),
      toSummaryListRow('Custodial term', stringifyTerm(s.custodialTerm)),
      toSummaryListRow('Licence period', stringifyTerm(s.licenceTerm)),
      toSummaryListRow('Consecutive or concurrent', s.sentenceServeType),
      // TODO We don't have the following for RaS sentences
      // toSummaryListRow('Unadjusted SLED', unadjustedSled),
      // toSummaryListRow('Unadjusted LED', unadjustedLed),
      // toSummaryListRow(
      //   consecutiveSentencePartBreakdown ? 'Aggregate sentence length' : 'Sentence length',
      //   consecutiveSentencePartBreakdown ? `${aggregateSentenceLengthDays}` : `${sentenceLengthDays}`,
      // ),
      toSummaryListRow('Recall Options', recallEligibility.code),
      toSummaryListRow('Recall Options reason', recallEligibility.description),
    ])
    const summarisedSentence: SummarisedSentence = {
      sentenceId: s.sentenceUuid,
      recallEligibility,
      summary,
      offenceCode: s.offenceCode,
      offenceDescription: s.offenceDescription,
    }

    summarisedGroup.eligibleSentences.push(summarisedSentence)
  })

  return summarisedGroup
}
