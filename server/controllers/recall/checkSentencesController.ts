import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import RecallBaseController from './recallBaseController'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import {
  getEligibleSentenceCount,
  getSummarisedSentenceGroups,
  getTemporaryCalc,
  isManualCaseSelection,
} from '../../helpers/formWizardHelper'
import ManageOffencesService from '../../services/manageOffencesService'

// eslint-disable-next-line import/no-unresolved
import { Sentence } from 'models'

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
    console.log('getOffenceNames - controller')
    const summarisedGroups = getSummarisedSentenceGroups(req)
    console.log('summarisedGroups', summarisedGroups)
    const offenceCodes = summarisedGroups
      .flatMap(group => group.sentences || [])
      .map(charge => charge.offenceCode)
      .filter(code => code)

      console.log('offenceCodes', offenceCodes)

    const offenceNameMap = await new ManageOffencesService().getOffenceMap(offenceCodes, req.user.token)
    console.log('offenceNameMap - controller', offenceNameMap)
    res.locals.offenceMap = offenceNameMap
    console.log(res.locals.offenceMap)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const eligibleSentenceCount = getEligibleSentenceCount(req)
    const manualJourney = isManualCaseSelection || eligibleSentenceCount === 0

    const calculation: CalculatedReleaseDates = getTemporaryCalc(req)

    res.locals.latestSled = calculation.dates.SLED
    res.locals.manualJourney = manualJourney
    const summarisedGroups = getSummarisedSentenceGroups(req)

    // Modify sentenceServeType if it's UNKNOWN for items in group.sentences
    const updatedSummarisedGroups = summarisedGroups
      ? summarisedGroups.map(group => {
          if (group.sentences) {
            const updatedSentences = group.sentences.map((chargeItem: Sentence) => {
              if (chargeItem.sentenceServeType === 'UNKNOWN') {
                return { ...chargeItem, sentenceServeType: 'Not specified' };
              }
              return chargeItem;
            });
            return { ...group, sentences: updatedSentences };
          }
          return group;
        })
      : [];

    res.locals.summarisedSentencesGroups = updatedSummarisedGroups
    res.locals.casesWithEligibleSentences = eligibleSentenceCount

    // console.log('------ Check Summary Sentences ------')
    // console.log(JSON.stringify(res.locals.summarisedSentencesGroups, undefined, 2))
    return super.locals(req, res)
  }
}
