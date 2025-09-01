import { Request, Response } from 'express'
import { getBreakdown, getCrdsSentences, getRevocationDate, sessionModelFields } from '../helpers/formWizardHelper'
import { setSessionValue } from '../helpers/sessionHelper'
import { groupSentencesByCaseRefAndCourt, hasManualOnlySentences, SummarisedSentenceGroup } from './sentenceUtils'
import summariseSentencesGroups from './CaseSentenceSummariser'
import { RecallType } from '../@types/recallTypes'
import { determineInvalidRecallTypes } from './RecallEligiblityCalculator'

export default function revocationDateCrdsDataComparison(req: Request | any, res: Response) {
  const sentences = getCrdsSentences(req) || []
  const breakdown = getBreakdown(req)
  const revocationDate = getRevocationDate(req)

  const groupedSentences = groupSentencesByCaseRefAndCourt(sentences)
  setSessionValue(req, sessionModelFields.GROUPED_SENTENCES, groupedSentences)

  const summarisedSentenceGroups: SummarisedSentenceGroup[] = summariseSentencesGroups(
    groupedSentences,
    breakdown,
    revocationDate,
  )
  setSessionValue(req, sessionModelFields.SUMMARISED_SENTENCES, summarisedSentenceGroups)

  const eligibleSentences = summarisedSentenceGroups.flatMap(g => g.eligibleSentences)

  const casesWithEligibleSentences = summarisedSentenceGroups.filter(group => group.hasEligibleSentences).length
  setSessionValue(req, sessionModelFields.CASES_WITH_ELIGIBLE_SENTENCES, casesWithEligibleSentences)

  const eligibleSentenceCount = eligibleSentences.length

  setSessionValue(req, sessionModelFields.ELIGIBLE_SENTENCE_COUNT, eligibleSentenceCount)

  const manualCaseSelection = hasManualOnlySentences(eligibleSentences)
  setSessionValue(req, sessionModelFields.MANUAL_CASE_SELECTION, manualCaseSelection)

  const invalidRecallTypes: RecallType[] = determineInvalidRecallTypes(summarisedSentenceGroups, revocationDate)
  setSessionValue(req, sessionModelFields.INVALID_RECALL_TYPES, invalidRecallTypes)

  setSessionValue(req, sessionModelFields.INVALID_RECALL_TYPES, invalidRecallTypes)
  res.locals.summarisedSentenceGroups = summarisedSentenceGroups
  setSessionValue(req, sessionModelFields.SUMMARISED_SENTENCES, summarisedSentenceGroups)
  res.locals.casesWithEligibleSentences = summarisedSentenceGroups.filter(group => group.hasEligibleSentences).length
  const sentenceCount = summarisedSentenceGroups?.flatMap((g: SummarisedSentenceGroup) =>
    g.eligibleSentences.flatMap(s => s.sentenceId),
  ).length
  setSessionValue(req, sessionModelFields.ELIGIBLE_SENTENCE_COUNT, sentenceCount)
  res.locals.casesWithEligibleSentences = sentenceCount
  res.locals.groups = summariseSentencesGroups
}
