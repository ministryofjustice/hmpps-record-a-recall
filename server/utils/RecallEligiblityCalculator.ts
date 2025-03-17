import { addDays, isBefore, isEqual, max } from 'date-fns'
import {
  ConcurrentSentenceBreakdown,
  ConsecutiveSentenceBreakdown,
  SentenceAndOffenceWithReleaseArrangements,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { eligibilityReasons, RecallEligibility } from '../@types/recallEligibility'
import logger from '../../logger'
import { SummarisedSentence } from './sentenceUtils'

export default function getIndividualEligibility(
  sentence: SentenceAndOffenceWithReleaseArrangements,
  concBreakdown: ConcurrentSentenceBreakdown,
  consBreakdown: ConsecutiveSentenceBreakdown,
  revocationDate: Date,
): RecallEligibility {
  const breakdown = concBreakdown || consBreakdown

  if (!breakdown) {
    logger.warn(
      `No breakdown found for sentence with line seq ${sentence.lineSequence} and case seq ${sentence.caseSequence}`,
    )
    return eligibilityReasons.NO_BREAKDOWN
  }

  const dateTypes = Object.keys(breakdown.dates)

  if (!breakdown.sentencedAt) {
    return eligibilityReasons.NO_SENTENCE_START
  }
  if (!dateTypes.includes('CRD')) {
    return eligibilityReasons.NO_CRD
  }
  if (!(dateTypes.includes('SLED') || dateTypes.includes('SED'))) {
    return eligibilityReasons.NO_SLED_OR_SED
  }

  const adjustedSled = breakdown.dates.SLED
    ? new Date(breakdown.dates.SLED.adjusted)
    : new Date(breakdown.dates.SED?.adjusted)

  const adjustedCrd = new Date(breakdown.dates.CRD.adjusted)

  if (revocationDate < new Date(sentence.sentenceDate)) {
    return eligibilityReasons.RECALL_DATE_BEFORE_SENTENCE_START
  }

  if (revocationDate > adjustedSled) {
    return eligibilityReasons.RECALL_DATE_AFTER_EXPIRATION_DATE
  }

  if (revocationDate < adjustedCrd) {
    return eligibilityReasons.HDC
  }

  // pull out fn to determine based on sentence type to be called after fetching ras data
  if (isNonSDS(sentence)) {
    return eligibilityReasons.NON_SDS
  }

  return eligibilityReasons.SDS
}

function isSDS(sentence: SentenceAndOffenceWithReleaseArrangements) {
  return sentence.sentenceTypeDescription.includes('Standard Determinate Sentence')
}

function isNonSDS(sentence: SentenceAndOffenceWithReleaseArrangements) {
  return !isSDS(sentence)
}

export function fourteenDayRecallRequired(sentences: SummarisedSentence[], revocationDate: Date): boolean {
  if (hasSentencesEqualToOrOverTwelveMonths(sentences) && !hasSentencesUnderTwelveMonths(sentences)) {
    logger.debug('All sentences are over twelve months')
    return false
  }
  if (hasSentencesUnderTwelveMonths(sentences) && !hasSentencesEqualToOrOverTwelveMonths(sentences)) {
    logger.debug('All sentences are under twelve months')
    return true
  }
  const latestExpiryDateOfTwelveMonthPlusSentences = max(
    sentences
      .filter(s => hasSled(s))
      .filter(s => over12MonthSentence(s))
      .map(s => s.unadjustedSled),
  )
  logger.debug('Mixture of sentence lengths')

  const fourteenDaysFromRecall = addDays(revocationDate, 14)
  logger.debug(
    `Checking if latest SLED [${latestExpiryDateOfTwelveMonthPlusSentences}] is over 14 days from date of recall [${fourteenDaysFromRecall}]`,
  )

  return (
    isEqual(latestExpiryDateOfTwelveMonthPlusSentences, fourteenDaysFromRecall) ||
    isBefore(latestExpiryDateOfTwelveMonthPlusSentences, fourteenDaysFromRecall)
  )
}

function hasSentencesEqualToOrOverTwelveMonths(sentences: SummarisedSentence[]): boolean {
  return sentences.some(over12MonthSentence)
}

function hasSentencesUnderTwelveMonths(sentences: SummarisedSentence[]): boolean {
  return sentences.some(sentence => sentence.sentenceLengthDays < 365)
}

function over12MonthSentence(sentence: SummarisedSentence) {
  return sentence.sentenceLengthDays >= 365
}

function hasSled(sentence: SummarisedSentence) {
  return sentence.unadjustedSled !== null
}
