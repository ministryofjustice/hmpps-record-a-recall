import FormWizard from 'hmpo-form-wizard'
import { getBreakdown, getCrdsSentences, getRevocationDate, sessionModelFields } from '../helpers/formWizardHelper'
import {
  groupSentencesByCaseRefAndCourt,
  hasManualOnlySentences,
  hasStandardOnlySentences,
  SummarisedSentenceGroup,
} from './sentenceUtils'
import summariseSentencesGroups from './CaseSentenceSummariser'

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

  const casesWithEligibleSentences = summarisedSentenceGroups.filter(group => group.hasEligibleSentences).length
  req.sessionModel.set(sessionModelFields.CASES_WITH_ELIGIBLE_SENTENCES, casesWithEligibleSentences)

  const eligibleSentenceCount = summarisedSentenceGroups
    .filter(group => group.hasEligibleSentences)
    .map(g => g.eligibleSentences.length)
    .reduce((sum, current) => sum + current, 0)
  req.sessionModel.set(sessionModelFields.ELIGIBLE_SENTENCE_COUNT, eligibleSentenceCount)

  const manualCaseSelection = summarisedSentenceGroups
    .filter(group => group.hasEligibleSentences)
    .flatMap(g => hasManualOnlySentences(g.eligibleSentences))
    .includes(true)
  req.sessionModel.set(sessionModelFields.MANUAL_CASE_SELECTION, manualCaseSelection)

  const standardOnlyRecall = summarisedSentenceGroups
    .filter(group => group.hasEligibleSentences)
    .flatMap(g => hasStandardOnlySentences(g.eligibleSentences))
    .includes(true)
  req.sessionModel.set(sessionModelFields.STANDARD_ONLY, standardOnlyRecall)
}
