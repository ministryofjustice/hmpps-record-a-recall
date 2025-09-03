import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'

import logger from '../../../logger'
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
    this.use(this.loadOffenceNames)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const eligibleSentenceCount = getEligibleSentenceCount(req)
    const manualJourney = isManualCaseSelection || eligibleSentenceCount === 0

    const calculation: CalculatedReleaseDates = getTemporaryCalc(req)
    const summarisedSentenceGroups = getSummarisedSentenceGroups(req)

    res.locals.latestSled = calculation?.dates?.SLED || null
    res.locals.manualJourney = manualJourney
    res.locals.summarisedSentencesGroups = summarisedSentenceGroups
    res.locals.casesWithEligibleSentences = eligibleSentenceCount

    console.log('[CheckSentencesController] Ineligible sentences being passed to template:', 
  JSON.stringify(summarisedSentenceGroups.flatMap(g => g.ineligibleSentences), null, 2))


    const locals = super.locals(req, res)
    const { prisoner } = res.locals

    let backLink = `/person/${prisoner.prisonerNumber}/record-recall/rtc-date`
    if (req.journeyModel.attributes.lastVisited?.includes('update-sentence-types-summary')) {
      backLink = `/person/${prisoner.prisonerNumber}/record-recall/update-sentence-types-summary`
    } else if (locals.isEditRecall) {
      backLink = `/person/${prisoner.prisonerNumber}/recall/${locals.recallId}/edit/edit-summary`
    }

    return { ...locals, backLink }
  }

  async getOffenceNameTitle(req: FormWizard.Request, offenceCodes: string[]) {
    return new ManageOffencesService().getOffenceMap(offenceCodes, req.user.token)
  }

  async loadOffenceNames(req: FormWizard.Request, res: Response, next: () => void) {
    try {
      const summarisedSentenceGroups = getSummarisedSentenceGroups(req)
      const offenceCodes = summarisedSentenceGroups
        .flatMap(group => group.sentences || [])
        .map(charge => charge.offenceCode)
        .filter(code => code)

      if (offenceCodes.length > 0) {
        const offenceNameMap = await this.getOffenceNameTitle(req, offenceCodes)
        res.locals.offenceNameMap = offenceNameMap
      } else {
        res.locals.offenceNameMap = {}
      }
      next()
    } catch (error) {
      logger.error('Error loading offence names:', error)
      res.locals.offenceNameMap = {}
      next()
    }
  }
}
