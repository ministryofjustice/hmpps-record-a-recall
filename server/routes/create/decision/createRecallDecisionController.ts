import { Request, Response } from 'express'
import { Controller } from '../../controller'
import CreateRecallUrls from '../createRecallUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { datePartsToDate, dateToIsoString } from '../../../utils/utils'
import { Page } from '../../../services/auditService'

export default class CreateRecallDecisionController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_DECISION

  constructor(private readonly calculateReleaseDatesService: CalculateReleaseDatesService) {}

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { username } = req.user
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!

    if (journey.revocationDate === undefined || journey.inCustodyAtRecall === undefined) {
      return res.redirect(CreateRecallUrls.start(nomsId))
    }

    const decision = await this.calculateReleaseDatesService.makeDecisionForRecordARecall(
      nomsId,
      {
        revocationDate: dateToIsoString(datePartsToDate(journey.revocationDate)),
      },
      username,
    )

    if (decision.decision === 'CRITICAL_ERRORS') {
      return res.redirect(CreateRecallUrls.criticalValidationIntercept(nomsId, journeyId))
    }
    if (decision.decision === 'CONFLICTING_ADJUSTMENTS') {
      return res.redirect(CreateRecallUrls.conflictingAdjustmentsIntercept(nomsId, journeyId))
    }
    if (decision.decision === 'NO_RECALLABLE_SENTENCES_FOUND') {
      return res.redirect(CreateRecallUrls.noRecallableSentencesFoundIntercept(nomsId, journeyId))
    }
    if (decision.decision === 'VALIDATION') {
      return res.redirect(CreateRecallUrls.selectCasesManualJourney(nomsId, journeyId))
    }
    if (decision.decision === 'AUTOMATED') {
      return res.redirect(CreateRecallUrls.reviewSentencesAutomatedJourney(nomsId, journeyId))
    }

    throw Error(`Uknown decision type: ${decision.decision}`)
  }
}
