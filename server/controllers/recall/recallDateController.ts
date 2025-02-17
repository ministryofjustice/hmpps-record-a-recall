import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import {
  groupSentencesByCaseRefAndCourt,
  hasManualOnlySentences,
  hasStandardOnlySentences,
  SummarisedSentenceGroup,
} from '../../utils/sentenceUtils'
import summariseSentencesGroups from '../../utils/CaseSentenceSummariser'
import { getBreakdown, getCrdsSentences, getRecallDate, sessionModelFields } from '../../helpers/formWizardHelper'

export default class RecallDateController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner: PrisonerSearchApiPrisoner = locals.prisoner as PrisonerSearchApiPrisoner

    const backLink = `/person/${prisoner.prisonerNumber}${locals.isEditRecall ? `/recall/${locals.recallId}/edit/edit-summary` : ''}`
    return { ...locals, backLink }
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    const sentences = getCrdsSentences(req)
    const breakdown = getBreakdown(req)
    const recallDate = getRecallDate(req)

    const groupedSentences = groupSentencesByCaseRefAndCourt(sentences)
    req.sessionModel.set(sessionModelFields.GROUPED_SENTENCES, groupedSentences)

    const summarisedSentenceGroups: SummarisedSentenceGroup[] = summariseSentencesGroups(
      groupedSentences,
      breakdown,
      recallDate,
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

    return super.successHandler(req, res, next)
  }
}
