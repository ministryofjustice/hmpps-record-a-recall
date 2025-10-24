import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { Controller } from '../../controller'
import CreateRecallUrls from '../createRecallUrls'
import { CreateRecallJourney } from '../../../@types/journeys'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'

export default class StartCreateRecallJourneyController implements Controller {
  constructor(private readonly calculateReleaseDatesService: CalculateReleaseDatesService) {}

  private MAX_JOURNEYS = 5

  GET = async (req: Request<{ nomsId: string }>, res: Response): Promise<void> => {
    const { username } = req.user
    const { nomsId } = req.params
    const crdsValidationResult = await this.calculateReleaseDatesService.validateForRecordARecall(nomsId, username)
    const journey: CreateRecallJourney = {
      id: uuidv4(),
      lastTouched: new Date().toISOString(),
      isCheckingAnswers: false,
      nomsId,
      crdsValidationResult,
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
    if (crdsValidationResult.criticalValidationMessages.length) {
      res.redirect(CreateRecallUrls.criticalValidationIntercept(nomsId, journey.id))
    } else {
      res.redirect(CreateRecallUrls.revocationDate(nomsId, journey.id))
    }
  }
}
