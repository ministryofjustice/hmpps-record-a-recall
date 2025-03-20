import FormWizard from 'hmpo-form-wizard'
import { getBreakdown, getCrdsSentences, getRevocationDate, sessionModelFields } from '../helpers/formWizardHelper'
import { groupSentencesByCaseRefAndCourt, hasManualOnlySentences, SummarisedSentenceGroup } from './sentenceUtils'
import summariseSentencesGroups from './CaseSentenceSummariser'
import { RecallType } from '../@types/recallTypes'
import { determineInvalidRecallTypes } from './RecallEligiblityCalculator'

export default function revocationDateCrdsDataComparison(req: FormWizard.Request) {
  const sentences = getCrdsSentences(req)
  const breakdown = getBreakdown(req)
  const revocationDate = getRevocationDate(req)

  const groupedSentences = groupSentencesByCaseRefAndCourt(sentences)
  req.sessionModel.set(sessionModelFields.GROUPED_SENTENCES, groupedSentences)

  const summarisedSentenceGroups: SummarisedSentenceGroup[] = summariseSentencesGroups(
    groupedSentences,
    breakdown,
    revocationDate,
  )
  req.sessionModel.set(sessionModelFields.SUMMARISED_SENTENCES, summarisedSentenceGroups)
  const eligibleSentences = summarisedSentenceGroups.flatMap(g => g.eligibleSentences)

  const casesWithEligibleSentences = summarisedSentenceGroups.filter(group => group.hasEligibleSentences).length
  req.sessionModel.set(sessionModelFields.CASES_WITH_ELIGIBLE_SENTENCES, casesWithEligibleSentences)

  const eligibleSentenceCount = eligibleSentences.length

  req.sessionModel.set(sessionModelFields.ELIGIBLE_SENTENCE_COUNT, eligibleSentenceCount)

  const manualCaseSelection = hasManualOnlySentences(eligibleSentences)
  req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, manualCaseSelection)

  const invalidRecallTypes: RecallType[] = determineInvalidRecallTypes(summarisedSentenceGroups, revocationDate)
  req.sessionModel.set(sessionModelFields.INVALID_RECALL_TYPES, invalidRecallTypes)
}
