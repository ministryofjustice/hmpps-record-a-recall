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
import ManageOffencesService from '../../services/manageOffencesService'
import CourtCaseService from '../../services/CourtCaseService'
import { services } from '../../services'

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

  // async getOffenceNameTitle(req: FormWizard.Request, offenceCodes: string[]) {
  //   return new ManageOffencesService().getOffenceMap(offenceCodes, req.user.token)
  // }


  async loadOffenceNames(req: FormWizard.Request, res: Response, next: () => void) {
    /// service.getOffenceNameMap()

    try {
      // const courtCaseService = new CourtCaseService());
      res.locals.offenceNameMap = req.services.courtCaseService.getOffenceNameMap(req)
      // const summarisedSentenceGroups = getSummarisedSentenceGroups(req)
      // const offenceCodes = summarisedSentenceGroups
      //   .flatMap(group => group.sentences || [])
      //   .map(charge => charge.offenceCode)
      //   .filter(code => code)

      // if (offenceCodes.length > 0) {
      //   const offenceNameMap = await this.getOffenceNameTitle(req, offenceCodes)
      //   res.locals.offenceNameMap = offenceNameMap
      // } else {
      //   res.locals.offenceNameMap = {}
      // }
      next()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading offence names:', error)
      res.locals.offenceNameMap = {}
      next()
    }
  }
}