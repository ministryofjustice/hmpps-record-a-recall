import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'

import RecallBaseController from './recallBaseController'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

export default class CheckSentencesController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const manualJourney = req.sessionModel.get<boolean>('manualSentenceSelection')

    const calculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')

    res.locals.latestSled = calculation.dates.SLED

    res.locals.summarisedSentencesGroups = req.sessionModel.get('summarisedSentencesGroups')
    res.locals.casesWithEligibleSentences = req.sessionModel.get('casesWithEligibleSentences')

    res.locals.manualJourney = manualJourney

    return super.locals(req, res)
  }
}
