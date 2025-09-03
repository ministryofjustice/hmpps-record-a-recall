import type { SentenceWithDpsUuid, Term } from 'models'
import { RecallableCourtCaseSentence } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
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
    externalSentenceId: sentence.externalSentenceId,
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
    externalSentenceId: part.externalSentenceId,
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
    const matching = allSentences.find(
      s =>
        s.bookingId === it.externalSentenceId.bookingId &&
        s.sentenceSequence === it.externalSentenceId.sentenceSequence,
    )
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

export function groupSentencesByCaseRefAndCourt(sentences: SentenceWithDpsUuid[]): GroupedSentences[] {
  // Handle undefined, null, or empty sentences array
  if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
    return []
  }

  try {
    // Group sentences by unique case reference and court combination
    const grouped = new Map<string, GroupedSentences>()

    sentences.forEach(sentence => {
      if (!sentence) return

      const caseReference = sentence.caseReference || 'Unknown'
      const courtName = sentence.courtDescription || 'Unknown Court'
      const key = `${caseReference}|${courtName}`

      if (!grouped.has(key)) {
        grouped.set(key, {
          caseReference,
          courtName,
          sentences: [],
        })
      }

      grouped.get(key)!.sentences.push(sentence)
    })

    return Array.from(grouped.values())
  } catch (error) {
    logger.error(`Error in groupSentencesByCaseRefAndCourt: ${error.message}`, error)
    return []
  }
}

export function findConsecutiveSentenceBreakdown(
  sentence: SentenceAndOffenceWithReleaseArrangements,
  breakdown: CalculationBreakdown,
): ConsecutiveSentencePart {
  return breakdown?.consecutiveSentence?.sentenceParts?.find(
    p =>
      p.externalSentenceId.sentenceSequence === sentence.sentenceSequence &&
      p.externalSentenceId.bookingId === sentence.bookingId,
  )
}
export function findConcurrentSentenceBreakdown(
  sentence: SentenceAndOffenceWithReleaseArrangements,
  breakdown: CalculationBreakdown,
): ConcurrentSentenceBreakdown {
  return breakdown?.concurrentSentences?.find(
    b =>
      b.externalSentenceId.sentenceSequence === sentence.sentenceSequence &&
      b.externalSentenceId.bookingId === sentence.bookingId,
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

export function calculateOverallSentenceLength(sentences?: RecallableCourtCaseSentence[]): Term {
  const total: Term = { years: 0, months: 0, weeks: 0, days: 0 }

  if (!sentences || sentences.length === 0) {
    return total
  }

  sentences.forEach(sentence => {
    // Find licence period length from periodLengths array
    const licencePeriod = sentence.periodLengths?.find(
      (p: { periodLengthType: string }) => p.periodLengthType === 'LICENCE_PERIOD',
    )

    if (licencePeriod) {
      total.days = (total.days || 0) + (licencePeriod.days || 0)
      total.weeks = (total.weeks || 0) + (licencePeriod.weeks || 0)
      total.months = (total.months || 0) + (licencePeriod.months || 0)
      total.years = (total.years || 0) + (licencePeriod.years || 0)
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
  fineAmount?: number
  outcomeUpdated?: string
  countNumber?: string
  convictionDate?: string
  terrorRelated?: boolean
  isSentenced?: boolean
  periodLengths?: PeriodLength[]
  sentenceServeType?: string
  consecutiveTo?: string
  sentenceType?: string
  sentenceDate?: string
}

export type SummarisedSentenceGroup = {
  caseRefAndCourt: string // Keeping for backward compatibility
  caseReference: string
  courtName: string
  eligibleSentences: SummarisedSentence[]
  ineligibleSentences: SummarisedSentence[]
  hasEligibleSentences: boolean
  hasIneligibleSentences: boolean
  sentences: RecallableCourtCaseSentence[]
}

export interface GroupedSentences {
  caseReference: string
  courtName: string
  sentences: SentenceWithDpsUuid[]
}
