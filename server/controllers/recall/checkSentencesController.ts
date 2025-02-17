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
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const eligibleSentenceCount = getEligibleSentenceCount(req)
    const manualJourney = isManualCaseSelection || eligibleSentenceCount === 0

    const calculation: CalculatedReleaseDates = getTemporaryCalc(req)

    res.locals.latestSled = calculation.dates.SLED
    res.locals.manualJourney = manualJourney
    res.locals.summarisedSentencesGroups = getSummarisedSentenceGroups(req)
    res.locals.casesWithEligibleSentences = eligibleSentenceCount

    return super.locals(req, res)
  }
}
