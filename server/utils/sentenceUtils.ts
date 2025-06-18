import type { SentenceWithDpsUuid, Term, Sentence } from 'models'
import {
  CalculationBreakdown,
  ConcurrentSentenceBreakdown,
  ConsecutiveSentenceBreakdown,
  ConsecutiveSentencePart,
  SentenceAndOffenceWithReleaseArrangements,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { SentenceDetail, SentenceDetailExtended } from '../@types/refData'
import logger from '../../logger'
import { RecallEligibility } from '../@types/recallEligibility'
import { SummaryListRow } from '../@types/govuk'

const FIXED_AND_STANDARD_CRITERIA = [
  ['ADIMP', '2003'],
  ['ADIMP_ORA', '2003'],
  ['SEC236A', '2003'],
  ['SOPC21', '2020'],
  ['ADIMP_ORA', '2020'],
  ['ADIMP', '2020'],
]

const SINGLE_MATCH_CRITERIA = [
  ['LASPO_DR', '2003'],
  ['IPP', '2003'],
  ['EDS21', '2020'],
]

export function filterAndCategorizeConcurrentSentences(
  sentences: ConcurrentSentenceBreakdown[],
  revocationDate: Date,
): {
  onLicenceConcurrent: SentenceDetail[]
  activeConcurrent: SentenceDetail[]
  expiredConcurrent: SentenceDetail[]
} {
  const onLicenceConcurrent: SentenceDetail[] = []
  const activeConcurrent: SentenceDetail[] = []
  const expiredConcurrent: SentenceDetail[] = []
  sentences.forEach(sentence => {
    const dateTypes = Object.keys(sentence.dates)

    // Ensure there is either SLED or SED and also CRD
    if (!((dateTypes.includes('SLED') || dateTypes.includes('SED')) && dateTypes.includes('CRD'))) {
      expiredConcurrent.push(mapConcurrentToSentenceDetail(sentence))
      return
    }

    // Determine whether to use SLED or SED
    const crd = new Date(sentence.dates.CRD?.adjusted)
    const sled = sentence.dates.SLED ? new Date(sentence.dates.SLED.adjusted) : new Date(sentence.dates.SED?.adjusted)

    // Categorize the sentence based on the recall date
    if (revocationDate > sled) {
      expiredConcurrent.push(mapConcurrentToSentenceDetail(sentence))
    } else if (revocationDate >= crd && revocationDate < sled) {
      onLicenceConcurrent.push(mapConcurrentToSentenceDetail(sentence))
    } else if (revocationDate < crd) {
      activeConcurrent.push(mapConcurrentToSentenceDetail(sentence))
    } else {
      expiredConcurrent.push(mapConcurrentToSentenceDetail(sentence))
    }
  })

  return { onLicenceConcurrent, activeConcurrent, expiredConcurrent }
}

export function filterAndCategorizeConsecutiveSentenceParts(
  consecutiveSentence: ConsecutiveSentenceBreakdown,
  revocationDate: Date,
): {
  onLicenceConsecutive: SentenceDetail[]
  activeConsecutive: SentenceDetail[]
  expiredConsecutive: SentenceDetail[]
} {
  const onLicenceConsecutive: SentenceDetail[] = []
  const activeConsecutive: SentenceDetail[] = []
  const expiredConsecutive: SentenceDetail[] = []

  const dateTypes = Object.keys(consecutiveSentence.dates)

  // Ensure there is either SLED or SED and also CRD
  if (!((dateTypes.includes('SLED') || dateTypes.includes('SED')) && dateTypes.includes('CRD'))) {
    consecutiveSentence.sentenceParts.forEach(part => {
      expiredConsecutive.push(mapConsecutivePartToSentenceDetail(part, new Date(), new Date()))
    })
    return { onLicenceConsecutive, activeConsecutive, expiredConsecutive }
  }

  // Determine whether to use SLED or SED
  const crd = new Date(consecutiveSentence.dates.CRD?.adjusted)
  const sled = consecutiveSentence.dates.SLED
    ? new Date(consecutiveSentence.dates.SLED.adjusted)
    : new Date(consecutiveSentence.dates.SED?.adjusted)

  consecutiveSentence.sentenceParts.forEach(part => {
    if (revocationDate > sled) {
      expiredConsecutive.push(mapConsecutivePartToSentenceDetail(part, crd, sled))
    } else if (revocationDate >= crd && revocationDate < sled) {
      onLicenceConsecutive.push(mapConsecutivePartToSentenceDetail(part, crd, sled))
    } else if (revocationDate < crd) {
      activeConsecutive.push(mapConsecutivePartToSentenceDetail(part, crd, sled))
    } else {
      expiredConsecutive.push(mapConsecutivePartToSentenceDetail(part, crd, sled))
    }
  })

  return { onLicenceConsecutive, activeConsecutive, expiredConsecutive }
}

export function mapConcurrentToSentenceDetail(sentence: ConcurrentSentenceBreakdown): SentenceDetail {
  return {
    lineSequence: sentence.lineSequence,
    caseSequence: sentence.caseSequence,
    sentencedAt: sentence.sentencedAt,
    sentenceLength: sentence.sentenceLength,
    consecutiveTo: null,
    crd: sentence.dates.CRD?.adjusted || '',
    sled: sentence.dates.SLED?.adjusted || '',
  }
}

export function mapConsecutivePartToSentenceDetail(
  part: ConsecutiveSentencePart,
  crd: Date,
  sled: Date,
): SentenceDetail {
  return {
    lineSequence: part.lineSequence,
    caseSequence: part.caseSequence,
    sentencedAt: crd.toISOString().split('T')[0], // Assuming CRD is used as the sentencing date for parts
    sentenceLength: part.sentenceLength,
    consecutiveTo: part.consecutiveToLineSequence || null,
    crd: crd.toISOString().split('T')[0],
    sled: sled.toISOString().split('T')[0],
  }
}

export function groupSentencesByRevocationDate(
  breakdown: CalculationBreakdown,
  revocationDate: Date,
): {
  onLicenceSentences: SentenceDetail[]
  activeSentences: SentenceDetail[]
  expiredSentences: SentenceDetail[]
} {
  if (!breakdown) {
    logger.error('Error in groupSentencesByRevocationDate: No calculationRequestId')
    return {
      onLicenceSentences: [],
      activeSentences: [],
      expiredSentences: [],
    }
  }
  try {
    // Filter and categorize concurrent sentences
    const { onLicenceConcurrent, activeConcurrent, expiredConcurrent } = filterAndCategorizeConcurrentSentences(
      breakdown.concurrentSentences,
      revocationDate,
    )

    // Filter and categorize consecutive sentence parts
    const { onLicenceConsecutive, activeConsecutive, expiredConsecutive } = breakdown.consecutiveSentence
      ? filterAndCategorizeConsecutiveSentenceParts(breakdown.consecutiveSentence, revocationDate)
      : { onLicenceConsecutive: [], activeConsecutive: [], expiredConsecutive: [] }

    // Combine all filtered sentences into their respective categories
    const onLicenceSentences = [...onLicenceConcurrent, ...onLicenceConsecutive]
    const activeSentences = [...activeConcurrent, ...activeConsecutive]
    const expiredSentences = [...expiredConcurrent, ...expiredConsecutive]

    if (onLicenceSentences.length === 0) {
      logger.error('There are no sentences eligible for recall.')
    }

    return {
      onLicenceSentences,
      activeSentences,
      expiredSentences,
    }
  } catch (error) {
    logger.error(`Error in groupSentencesByRevocationDate: ${error.message}`, error)
    return {
      onLicenceSentences: [],
      activeSentences: [],
      expiredSentences: [],
    }
  }
}

export function getDecoratedOnLicenceSentences(
  onLicenceSentences: SentenceDetail[],
  allSentences: SentenceAndOffenceWithReleaseArrangements[],
) {
  return onLicenceSentences.map(it => {
    const matching = allSentences.find(s => s.caseSequence === it.caseSequence && s.lineSequence === it.lineSequence)
    return {
      ...it,
      sentenceCalculationType: matching.sentenceCalculationType,
      sentenceCategory: matching.sentenceCategory,
    } as SentenceDetailExtended
  })
}

export function getFixedAndStandardEligibleSentences(decoratedOnLicenceSentences: SentenceDetailExtended[]) {
  return decoratedOnLicenceSentences.every(sentence =>
    FIXED_AND_STANDARD_CRITERIA.some(
      ([calculationType, category]) =>
        sentence.sentenceCalculationType === calculationType && sentence.sentenceCategory === category,
    ),
  )
}

export function getSingleMatchSentences(decoratedOnLicenceSentences: SentenceDetailExtended[]) {
  return decoratedOnLicenceSentences.every(sentence =>
    SINGLE_MATCH_CRITERIA.some(
      ([calculationType, category]) =>
        sentence.sentenceCalculationType === calculationType && sentence.sentenceCategory === category,
    ),
  )
}

export function hasSingleTypeOfSentence(decoratedSentences: SentenceDetailExtended[]): boolean {
  return FIXED_AND_STANDARD_CRITERIA.some(([calculationType, category]) =>
    decoratedSentences.every(
      sentence => sentence.sentenceCalculationType === calculationType && sentence.sentenceCategory === category,
    ),
  )
}

export function groupSentencesByCaseRefAndCourt(
  sentences: SentenceWithDpsUuid[],
): Record<string, SentenceAndOffenceWithReleaseArrangements[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return sentences.reduce((result: any, currentValue: any) => {
    const ref = `${currentValue.caseReference || 'Case'} at ${currentValue.courtDescription}`
    // eslint-disable-next-line no-param-reassign
    ;(result[ref] = result[ref] || []).push(currentValue)
    return result
  }, {})
}

export function findConsecutiveSentenceBreakdown(
  sentence: SentenceAndOffenceWithReleaseArrangements,
  breakdown: CalculationBreakdown,
): ConsecutiveSentencePart {
  return breakdown?.consecutiveSentence?.sentenceParts?.find(
    p => p.caseSequence === sentence.caseSequence && p.lineSequence === sentence.lineSequence,
  )
}
export function findConcurrentSentenceBreakdown(
  sentence: SentenceAndOffenceWithReleaseArrangements,
  breakdown: CalculationBreakdown,
): ConcurrentSentenceBreakdown {
  return breakdown?.concurrentSentences?.find(
    b => b.caseSequence === sentence.caseSequence && b.lineSequence === sentence.lineSequence,
  )
}

export function hasABreakdown(sentence: SentenceAndOffenceWithReleaseArrangements, breakdowns: CalculationBreakdown) {
  return findConcurrentSentenceBreakdown(sentence, breakdowns) || findConsecutiveSentenceBreakdown(sentence, breakdowns)
}

export function hasManualOnlySentences(sentences: SummarisedSentence[]): boolean {
  return sentences.some(sentence => sentence.recallEligibility.recallRoute === 'MANUAL')
}
export type PeriodLength = {
  description: string
  years?: string
  months?: string
  weeks?: string
  days?: string
  periodOrder: Array<'years' | 'months' | 'weeks' | 'days'>
}

export function formatTerm(term: Term | undefined): string {
  if (!term) {
    return 'Not specified'
  }

  const years = typeof term.years === 'number' ? term.years : 0
  const months = typeof term.months === 'number' ? term.months : 0
  const weeks = typeof term.weeks === 'number' ? term.weeks : 0
  const days = typeof term.days === 'number' ? term.days : 0

  const parts: string[] = [
    `${years} year${years !== 1 ? 's' : ''}`,
    `${months} month${months !== 1 ? 's' : ''}`,
    `${weeks} week${weeks !== 1 ? 's' : ''}`,
    `${days} day${days !== 1 ? 's' : ''}`,
  ]

  return parts.join(' ')
}

export function formatSentenceServeType(sentenceServeType?: string, consecutiveToChargeNumber?: string): string {
  if (consecutiveToChargeNumber) {
    return `Consecutive to charge ${consecutiveToChargeNumber}`
  }
  if (sentenceServeType === 'CONCURRENT') {
    return 'Concurrent'
  }
  if (sentenceServeType === 'FORTHWITH') {
    return 'Forthwith'
  }
  return sentenceServeType || 'Not specified'
}

export function calculateOverallSentenceLength(sentences?: Sentence[]): Term {
  const total: Term = { years: 0, months: 0, weeks: 0, days: 0 }

  if (!sentences || sentences.length === 0) {
    return total
  }

  sentences.forEach(sentence => {
    if (sentence.licenceTerm) {
      total.days = (total.days || 0) + (sentence.licenceTerm.days || 0)
      total.weeks = (total.weeks || 0) + (sentence.licenceTerm.weeks || 0)
      total.months = (total.months || 0) + (sentence.licenceTerm.months || 0)
      total.years = (total.years || 0) + (sentence.licenceTerm.years || 0)
    }
  })

  // Carry-overs
  if (total.days && total.days >= 7) {
    total.weeks = (total.weeks || 0) + Math.floor(total.days / 7)
    total.days %= 7
  }
  // Assuming 4 weeks per month
  if (total.weeks && total.weeks >= 4) {
    total.months = (total.months || 0) + Math.floor(total.weeks / 4)
    total.weeks %= 4
  }
  if (total.months && total.months >= 12) {
    total.years = (total.years || 0) + Math.floor(total.months / 12)
    total.months %= 12
  }

  return total
}

export type SummarisedSentence = {
  sentenceId?: string
  recallEligibility: RecallEligibility
  summary: SummaryListRow[]
  offenceCode: string
  offenceDescription?: string
  unadjustedSled?: string
  sentenceLengthDays?: number
  offenceStartDate?: string
  offenceEndDate?: string
  outcome?: string
  outcomeUpdated?: string
  countNumber?: string
  convictionDate?: string
  terrorRelated?: boolean
  isSentenced?: boolean
  periodLengths?: PeriodLength[]
  sentenceServeType?: string
  consecutiveTo?: string
  sentenceType?: string
}

export type SummarisedSentenceGroup = {
  caseRefAndCourt: string
  eligibleSentences: SummarisedSentence[]
  ineligibleSentences: SummarisedSentence[]
  hasEligibleSentences: boolean
  hasIneligibleSentences: boolean
  sentences: Sentence[]
}
