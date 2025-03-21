import { addDays, isAfter, isBefore, isEqual, isValid, max } from 'date-fns'
// eslint-disable-next-line import/no-unresolved
import { Sentence } from 'models'
import { compact } from 'lodash'
import {
  ConcurrentSentenceBreakdown,
  ConsecutiveSentenceBreakdown,
  SentenceAndOffenceWithReleaseArrangements,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { eligibilityReasons, RecallEligibility } from '../@types/recallEligibility'
import logger from '../../logger'
import { SummarisedSentence, SummarisedSentenceGroup } from './sentenceUtils'
import { RecallType, RecallTypes } from '../@types/recallTypes'

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

  return determineEligibilityOnCrdsSentenceType(sentence)
}

export function determineEligibilityOnRasSentenceType(sentence: Sentence): RecallEligibility {
  if (!sentence.sentenceType) {
    return eligibilityReasons.RAS_LEGACY_SENTENCE
  }
  if (isNonSDS(sentence.sentenceType)) {
    return eligibilityReasons.NON_SDS
  }
  return eligibilityReasons.SDS
}

function determineEligibilityOnCrdsSentenceType(
  sentence: SentenceAndOffenceWithReleaseArrangements,
): RecallEligibility {
  if (isNonSDS(sentence.sentenceTypeDescription)) {
    return eligibilityReasons.NON_SDS
  }

  return eligibilityReasons.SDS
}

function isSDS(sentenceDescription: string) {
  return sentenceDescription.includes('Standard Determinate Sentence')
}

function isNonSDS(sentenceDescription: string) {
  return !isSDS(sentenceDescription)
}

export function fourteenDayRecallPossible(sentences: SummarisedSentence[], revocationDate: Date): boolean {
  if (hasSentencesUnderTwelveMonths(sentences) && !hasSentencesEqualToOrOverTwelveMonths(sentences)) {
    logger.debug('All sentences are under twelve months')
    return true
  }
  const latestExpiryDateOfTwelveMonthPlusSentences = getLatestExpiryDateOfTwelveMonthPlusSentences(sentences)

  logger.debug('Mixture of sentence lengths')

  const fourteenDaysFromRecall = addDays(revocationDate, 14)
  logger.debug(
    `Checking if latest SLED [${latestExpiryDateOfTwelveMonthPlusSentences}] is over 14 days from date of recall [${fourteenDaysFromRecall}]`,
  )

  return (
    isValid(latestExpiryDateOfTwelveMonthPlusSentences) &&
    (isEqual(latestExpiryDateOfTwelveMonthPlusSentences, fourteenDaysFromRecall) ||
      isBefore(latestExpiryDateOfTwelveMonthPlusSentences, fourteenDaysFromRecall))
  )
}

export function twentyEightDayRecallPossible(sentences: SummarisedSentence[], revocationDate: Date): boolean {
  if (hasSentencesEqualToOrOverTwelveMonths(sentences) && !hasSentencesUnderTwelveMonths(sentences)) {
    logger.debug('All sentences are over twelve months')
    return true
  }
  if (hasSentencesUnderTwelveMonths(sentences) && !hasSentencesEqualToOrOverTwelveMonths(sentences)) {
    logger.debug('All sentences are under twelve months')
    return false
  }
  const latestExpiryDateOfTwelveMonthPlusSentences = getLatestExpiryDateOfTwelveMonthPlusSentences(sentences)
  logger.debug('Mixture of sentence lengths')

  const fourteenDaysFromRecall = addDays(revocationDate, 14)
  logger.debug(
    `Checking if latest SLED [${latestExpiryDateOfTwelveMonthPlusSentences}] is over 14 days from date of recall [${fourteenDaysFromRecall}]`,
  )

  return (
    isValid(latestExpiryDateOfTwelveMonthPlusSentences) &&
    isAfter(latestExpiryDateOfTwelveMonthPlusSentences, fourteenDaysFromRecall)
  )
}

function getLatestExpiryDateOfTwelveMonthPlusSentences(sentences: SummarisedSentence[]) {
  return max(
    sentences
      .filter(s => hasSled(s))
      .filter(s => over12MonthSentence(s))
      .map(s => s.unadjustedSled),
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

export function determineInvalidRecallTypes(
  summarisedSentenceGroups: SummarisedSentenceGroup[],
  revocationDate: Date,
): RecallType[] {
  const eligibleSentences = summarisedSentenceGroups.flatMap(g => g.eligibleSentences)
  return compact([
    ...new Set([
      ...eligibleSentences.flatMap(s => s.recallEligibility.ineligibleRecallTypes),
      ...getInvalidFixedTermTypes(eligibleSentences, revocationDate),
    ]),
  ])
}

function getInvalidFixedTermTypes(sentences: SummarisedSentence[], revocationDate: Date): RecallType[] {
  const invalidFixedTerms: RecallType[] = []
  if (!fourteenDayRecallPossible(sentences, revocationDate)) {
    invalidFixedTerms.push(RecallTypes.HDC_FOURTEEN_DAY_RECALL, RecallTypes.FOURTEEN_DAY_FIXED_TERM_RECALL)
  }
  if (!twentyEightDayRecallPossible(sentences, revocationDate)) {
    invalidFixedTerms.push(RecallTypes.HDC_TWENTY_EIGHT_DAY_RECALL, RecallTypes.TWENTY_EIGHT_DAY_FIXED_TERM_RECALL)
  }
  return invalidFixedTerms
}
