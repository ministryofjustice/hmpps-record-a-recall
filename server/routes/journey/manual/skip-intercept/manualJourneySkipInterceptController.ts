import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { PersonJourneyParams } from '../../../../@types/journeys'
import RecallJourneyUrls from '../../recallJourneyUrls'
import { Page } from '../../../../services/auditService'
import { manualJourneyReset } from '../../recallJourneyOperations'

export default class ManualJourneySkipInterceptController implements Controller {
  public PAGE_NAME = Page.MANUAL_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]

    manualJourneyReset(journey)
    journey.switchedFromAutomatedJourney = true

    return res.redirect(RecallJourneyUrls.manualSelectCases(nomsId, journeyId, createOrEdit, recallId))
  }
}
