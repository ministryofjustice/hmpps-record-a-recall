import FormWizard from 'hmpo-form-wizard'
import { Response, NextFunction } from 'express'

import RecallBaseController from './recallBaseController'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import {
  getEligibleSentenceCount,
  getSummarisedSentenceGroups,
  getTemporaryCalc,
  isManualCaseSelection,
} from '../../helpers/formWizardHelper'
import ManageOffencesService from '../../services/manageOffencesService'

export default class CheckSentencesController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  async get(req: FormWizard.Request, res: Response, next: NextFunction) {
    await super.get(req, res, next)
    await this.getOffenceNames(req, res)
    return this.locals(req, res)
  }

  async getOffenceNames(req: FormWizard.Request, res: Response) {
    const summarisedGroups = getSummarisedSentenceGroups(req)
    const offenceCodes = (Array.isArray(summarisedGroups) ? summarisedGroups : [])
      .flatMap(group => (group.eligibleSentences || []).concat(group.ineligibleSentences || []))
      .map(charge => charge.offenceCode)
      .filter(code => code)

    if (offenceCodes.length > 0) {
      const offenceNameMap = await new ManageOffencesService().getOffenceMap(offenceCodes, req.user.token)
      res.locals.offenceNameMap = offenceNameMap
    } else {
      res.locals.offenceNameMap = {}
    }
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const eligibleSentenceCount = getEligibleSentenceCount(req)
    const manualJourney = isManualCaseSelection || eligibleSentenceCount === 0

    const calculation: CalculatedReleaseDates = getTemporaryCalc(req)
    const rawSummarisedGroups = getSummarisedSentenceGroups(req)

    res.locals.latestSled = calculation.dates.SLED
    res.locals.manualJourney = manualJourney
    res.locals.summarisedSentencesGroups = Array.isArray(rawSummarisedGroups) ? rawSummarisedGroups : []
    res.locals.casesWithEligibleSentences = eligibleSentenceCount

    return super.locals(req, res)
  }
}
