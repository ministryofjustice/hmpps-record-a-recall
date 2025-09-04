import { Response, NextFunction } from 'express'
import { Session } from 'express-session'
import logger from '../../../logger'
import RecallBaseController from './recallBaseController'
import { ExtendedRequest } from '../base/ExpressBaseController'
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

  locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const eligibleSentenceCount = getEligibleSentenceCount(req as ExtendedRequest & { sessionModel?: unknown })
    const manualJourney = isManualCaseSelection || eligibleSentenceCount === 0

    const calculation: CalculatedReleaseDates = getTemporaryCalc(req as ExtendedRequest & { sessionModel?: unknown })
    const summarisedSentenceGroups = getSummarisedSentenceGroups(req as ExtendedRequest & { sessionModel?: unknown })

    res.locals.latestSled = calculation?.dates?.SLED || null
    res.locals.manualJourney = manualJourney
    res.locals.summarisedSentencesGroups = summarisedSentenceGroups
    res.locals.casesWithEligibleSentences = eligibleSentenceCount

    const locals = super.locals(req, res)
    const { prisoner } = res.locals

    let backLink = `/person/${prisoner.prisonerNumber}/record-recall/rtc-date`
    const lastVisited = (req.session as Session & { lastVisited?: string })?.lastVisited || ''
    if (lastVisited.includes('update-sentence-types-summary')) {
      backLink = `/person/${prisoner.prisonerNumber}/record-recall/update-sentence-types-summary`
    } else if (locals.isEditRecall) {
      backLink = `/person/${prisoner.prisonerNumber}/recall/${locals.recallId}/edit/edit-summary`
    }

    return { ...locals, backLink }
  }

  async getOffenceNameTitle(req: ExtendedRequest, offenceCodes: string[]) {
    return new ManageOffencesService().getOffenceMap(offenceCodes, (req as Express.Request).user?.token)
  }

  async loadOffenceNames(req: ExtendedRequest, res: Response, next: NextFunction) {
    try {
      const summarisedSentenceGroups = getSummarisedSentenceGroups(req as ExtendedRequest & { sessionModel?: unknown })
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
