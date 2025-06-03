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

// eslint-disable-next-line import/no-unresolved
import { Sentence } from 'models'

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
