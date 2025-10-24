import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { Controller } from '../../controller'
import CreateRecallUrls from '../createRecallUrls'
import { CreateRecallJourney } from '../../../@types/journeys'

export default class StartCreateRecallJourneyController implements Controller {
  private MAX_JOURNEYS = 5

  GET = async (req: Request<{ nomsId: string }>, res: Response): Promise<void> => {
    const { nomsId } = req.params
    const journey: CreateRecallJourney = {
      id: uuidv4(),
      lastTouched: new Date().toISOString(),
      isCheckingAnswers: false,
      nomsId,
    }
    if (!req.session.createRecallJourneys) {
      req.session.createRecallJourneys = {}
    }
    req.session.createRecallJourneys[journey.id] = journey
    if (Object.entries(req.session.createRecallJourneys).length > this.MAX_JOURNEYS) {
      Object.values(req.session.createRecallJourneys)
        .sort(
          (a: CreateRecallJourney, b: CreateRecallJourney) =>
            new Date(b.lastTouched).getTime() - new Date(a.lastTouched).getTime(),
        )
        .slice(this.MAX_JOURNEYS)
        .forEach(journeyToRemove => delete req.session.createRecallJourneys![journeyToRemove.id])
    }
    res.redirect(CreateRecallUrls.revocationDate(nomsId, journey.id))
  }
}
