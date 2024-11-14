import {
  CalculationBreakdown,
  ConcurrentSentenceBreakdown,
  ConsecutiveSentenceBreakdown,
  ConsecutiveSentencePart,
  SentenceAndOffenceWithReleaseArrangements,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { SentenceDetail, SentenceDetailExtended } from '../@types/refData'
import logger from '../../logger'

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
  recallDate: Date,
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
    if (recallDate > sled) {
      expiredConcurrent.push(mapConcurrentToSentenceDetail(sentence))
    } else if (recallDate >= crd && recallDate < sled) {
      onLicenceConcurrent.push(mapConcurrentToSentenceDetail(sentence))
    } else if (recallDate < crd) {
      activeConcurrent.push(mapConcurrentToSentenceDetail(sentence))
    } else {
      expiredConcurrent.push(mapConcurrentToSentenceDetail(sentence))
    }
  })

  return { onLicenceConcurrent, activeConcurrent, expiredConcurrent }
}

export function filterAndCategorizeConsecutiveSentenceParts(
  consecutiveSentence: ConsecutiveSentenceBreakdown,
  recallDate: Date,
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
    if (recallDate > sled) {
      expiredConsecutive.push(mapConsecutivePartToSentenceDetail(part, crd, sled))
    } else if (recallDate >= crd && recallDate < sled) {
      onLicenceConsecutive.push(mapConsecutivePartToSentenceDetail(part, crd, sled))
    } else if (recallDate < crd) {
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

export function groupSentencesByRecallDate(
  breakdown: CalculationBreakdown,
  recallDate: Date,
): {
  onLicenceSentences: SentenceDetail[]
  activeSentences: SentenceDetail[]
  expiredSentences: SentenceDetail[]
} {
  if (!breakdown) {
    logger.error('Error in groupSentencesByRecallDate: No calculationRequestId')
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
      recallDate,
    )

    // Filter and categorize consecutive sentence parts
    const { onLicenceConsecutive, activeConsecutive, expiredConsecutive } = breakdown.consecutiveSentence
      ? filterAndCategorizeConsecutiveSentenceParts(breakdown.consecutiveSentence, recallDate)
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
    logger.error(`Error in groupSentencesByRecallDate: ${error.message}`, error)
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