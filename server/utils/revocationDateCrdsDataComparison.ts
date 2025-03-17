import FormWizard from 'hmpo-form-wizard'
import { getBreakdown, getCrdsSentences, getRevocationDate, sessionModelFields } from '../helpers/formWizardHelper'
import {
  groupSentencesByCaseRefAndCourt,
  hasManualOnlySentences,
  SummarisedSentence,
  SummarisedSentenceGroup,
} from './sentenceUtils'
import summariseSentencesGroups from './CaseSentenceSummariser'
import { RecallType, RecallTypes } from '../@types/recallTypes'
import { fourteenDayRecallRequired } from './RecallEligiblityCalculator'

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

  const invalidRecallTypes: RecallType[] = [
    ...new Set([
      ...eligibleSentences.flatMap(s => s.recallEligibility.ineligibleRecallTypes),
      ...getInvalidFixedTermTypes(eligibleSentences, revocationDate),
    ]),
  ]

  console.log(`Invalid recall types: ${invalidRecallTypes.map(t => t.description).join(', ')}`)
  req.sessionModel.set(sessionModelFields.INVALID_RECALL_TYPES, invalidRecallTypes)
}

function getInvalidFixedTermTypes(sentences: SummarisedSentence[], revocationDate: Date): RecallType[] {
  if (fourteenDayRecallRequired(sentences, revocationDate)) {
    console.log('14 day recall required, marking 28 day invalid')
    return [RecallTypes.TWENTY_EIGHT_DAY_FIXED_TERM_RECALL, RecallTypes.HDC_TWENTY_EIGHT_DAY_RECALL]
  }
  console.log('28 day recall required, marking 14 day invalid')
  return [RecallTypes.HDC_FOURTEEN_DAY_RECALL, RecallTypes.FOURTEEN_DAY_FIXED_TERM_RECALL]
}
