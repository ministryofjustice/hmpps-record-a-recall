import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'

import RecallBaseController from './recallBaseController'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import {
  getEligibleSentenceCount,
  getSummarisedSentenceGroups,
  getTemporaryCalc,
  isManualCaseSelection,
} from '../../helpers/formWizardHelper'

export default class CheckSentencesController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.loadOffenceNames)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const eligibleSentenceCount = getEligibleSentenceCount(req)
    const manualJourney = isManualCaseSelection || eligibleSentenceCount === 0

    const calculation: CalculatedReleaseDates = getTemporaryCalc(req)
    const summarisedSentenceGroups = getSummarisedSentenceGroups(req)

    res.locals.latestSled = calculation.dates.SLED
    res.locals.manualJourney = manualJourney
    res.locals.summarisedSentencesGroups = summarisedSentenceGroups
    res.locals.casesWithEligibleSentences = eligibleSentenceCount

    return super.locals(req, res)
  }


  async loadOffenceNames(req: FormWizard.Request, res: Response, next: () => void) {
    try {
      res.locals.offenceNameMap = req.services.courtCaseService.getOffenceNameMap(req)

      next()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading offence names:', error)
      res.locals.offenceNameMap = {}
      next()
    }
  }
}