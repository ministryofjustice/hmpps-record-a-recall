import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { datePartsToDate, dateToIsoString } from '../../../utils/utils'
import { Page } from '../../../services/auditService'

export default class CreateRecallDecisionController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_DECISION

  constructor(private readonly calculateReleaseDatesService: CalculateReleaseDatesService) {}

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { username } = req.user
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!

    if (!journey.revocationDate || journey.inCustodyAtRecall === undefined) {
      return res.redirect(RecallJourneyUrls.start(nomsId, createOrEdit, recallId))
    }

    const decision = await this.calculateReleaseDatesService.makeDecisionForRecordARecall(
      nomsId,
      {
        revocationDate: dateToIsoString(datePartsToDate(journey.revocationDate)),
      },
      username,
    )

    if (decision.decision === 'CRITICAL_ERRORS') {
      return res.redirect(RecallJourneyUrls.criticalValidationIntercept(nomsId, journeyId, createOrEdit, recallId))
    }
    if (decision.decision === 'CONFLICTING_ADJUSTMENTS') {
      return res.redirect(RecallJourneyUrls.conflictingAdjustmentsIntercept(nomsId, journeyId, createOrEdit, recallId))
    }
    if (decision.decision === 'NO_RECALLABLE_SENTENCES_FOUND') {
      return res.redirect(
        RecallJourneyUrls.noRecallableSentencesFoundIntercept(nomsId, journeyId, createOrEdit, recallId),
      )
    }
    if (decision.decision === 'VALIDATION') {
      return res.redirect(RecallJourneyUrls.manualJourneyStart(nomsId, journeyId, createOrEdit, recallId))
    }
    if (decision.decision === 'AUTOMATED') {
      return res.redirect(RecallJourneyUrls.reviewSentencesAutomatedJourney(nomsId, journeyId, createOrEdit, recallId))
    }

    throw Error(`Unknown decision type: ${decision.decision}`)
  }
}
