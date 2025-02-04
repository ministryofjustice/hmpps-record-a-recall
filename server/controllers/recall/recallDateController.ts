import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import {
  CalculationBreakdown,
  SentenceAndOffenceWithReleaseArrangements,
} from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import {
  groupSentencesByCaseRefAndCourt,
  hasManualOnlySentences,
  hasStandardOnlySentences,
  summarisedSentenceGroup,
} from '../../utils/sentenceUtils'
import summariseSentencesGroups from '../../utils/CaseSentenceSummariser'

export default class RecallDateController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner: PrisonerSearchApiPrisoner = locals.prisoner as PrisonerSearchApiPrisoner

    const backLink = `/person/${prisoner.prisonerNumber}${locals.isEditRecall ? `/recall/${locals.recallId}/edit/edit-summary` : ''}`
    return { ...locals, backLink }
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    const sentences = req.sessionModel.get<SentenceAndOffenceWithReleaseArrangements[]>('sentences')
    const breakdown = req.sessionModel.get<CalculationBreakdown>('breakdown')
    const recallDate = new Date(req.sessionModel.get<string>('recallDate'))

    const groupedSentences = groupSentencesByCaseRefAndCourt(sentences)
    req.sessionModel.set('groupedSentences', groupedSentences)

    const summarisedSentenceGroups: summarisedSentenceGroup[] = summariseSentencesGroups(
      groupedSentences,
      breakdown,
      recallDate,
    )
    req.sessionModel.set('summarisedSentencesGroups', summarisedSentenceGroups)

    const casesWithEligibleSentences = summarisedSentenceGroups.filter(group => group.hasEligibleSentences).length
    req.sessionModel.set('casesWithEligibleSentences', casesWithEligibleSentences)

    const eligibleSentenceCount = summarisedSentenceGroups
      .filter(group => group.hasEligibleSentences)
      .map(g => g.eligibleSentences.length)
      .reduce((sum, current) => sum + current, 0)
    req.sessionModel.set('eligibleSentenceCount', eligibleSentenceCount)

    const manualSentenceSelection = summarisedSentenceGroups
      .filter(group => group.hasEligibleSentences)
      .flatMap(g => hasManualOnlySentences(g.eligibleSentences))
      .includes(true)
    req.sessionModel.set('manualSentenceSelection', manualSentenceSelection)

    const standardOnlyRecall = summarisedSentenceGroups
      .filter(group => group.hasEligibleSentences)
      .flatMap(g => hasStandardOnlySentences(g.eligibleSentences))
      .includes(true)
    req.sessionModel.set('standardOnlyRecall', standardOnlyRecall)

    return super.successHandler(req, res, next)
  }
}
