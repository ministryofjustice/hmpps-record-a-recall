import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'

// eslint-disable-next-line import/no-unresolved
import { CourtCase } from 'models'
import RecallBaseController from './recallBaseController'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'

export default class CheckSentencesController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const eligibleSentenceCount = req.sessionModel.get<number>('casesWithEligibleSentences')
    const manualJourney = req.sessionModel.get<boolean>('manualSentenceSelection') || eligibleSentenceCount === 0

    const calculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')

    res.locals.latestSled = calculation.dates.SLED

    res.locals.manualJourney = manualJourney
    if (manualJourney) {
      const selectedCases = req.sessionModel.get<string[]>('courtCases')
      const caseDetails = req.sessionModel
        .get<CourtCase[]>('allCourtCases')
        .filter((detail: CourtCase) => selectedCases.includes(detail.caseId))
      const summarisedSentencesGroups = summariseRasCases(caseDetails)
      res.locals.summarisedSentencesGroups = summarisedSentencesGroups
      res.locals.casesWithEligibleSentences = summarisedSentencesGroups.filter(
        group => group.hasEligibleSentences,
      ).length
    } else {
      res.locals.summarisedSentencesGroups = req.sessionModel.get('summarisedSentencesGroups')
      res.locals.casesWithEligibleSentences = eligibleSentenceCount
    }

    return super.locals(req, res)
  }
}
