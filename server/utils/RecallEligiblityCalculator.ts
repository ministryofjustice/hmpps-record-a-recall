import {
  ConcurrentSentenceBreakdown,
  ConsecutiveSentenceBreakdown,
  SentenceAndOffenceWithReleaseArrangements,
} from '../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { eligibilityReasons, RecallEligibility } from '../@types/recallEligibility'
import logger from '../../logger'

export default function getEligibility(
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

  if (revocationDate < adjustedCrd) {
    return eligibilityReasons.RECALL_DATE_BEFORE_RELEASE_DATE
  }

  if (revocationDate > adjustedSled) {
    return eligibilityReasons.RECALL_DATE_AFTER_EXPIRATION_DATE
  }

  if (isNonSDS(sentence)) {
    return eligibilityReasons.NON_SDS
  }

  return eligibilityReasons.HAPPY_PATH_POSSIBLE
}

function isSDS(sentence: SentenceAndOffenceWithReleaseArrangements) {
  return sentence.sentenceTypeDescription.includes('Standard Determinate Sentence')
}

function isNonSDS(sentence: SentenceAndOffenceWithReleaseArrangements) {
  return !isSDS(sentence)
}
