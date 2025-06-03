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
import summariseSentencesGroups from '../../utils/CaseSentenceSummariser'

export default class CheckSentencesController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const eligibleSentenceCount = getEligibleSentenceCount(req)
    const manualJourney = isManualCaseSelection || eligibleSentenceCount === 0

    const calculation: CalculatedReleaseDates = getTemporaryCalc(req)
    // const sentencesToDisplay = getS

    res.locals.latestSled = calculation.dates.SLED
    res.locals.manualJourney = manualJourney
    res.locals.summarisedSentencesGroups = getSummarisedSentenceGroups(req)
    res.locals.casesWithEligibleSentences = eligibleSentenceCount
    console.log('------ Check Summary Sentences ------')
    console.log(JSON.stringify(res.locals.summarisedSentencesGroups, undefined, 2))

    return super.locals(req, res)
  }
}
