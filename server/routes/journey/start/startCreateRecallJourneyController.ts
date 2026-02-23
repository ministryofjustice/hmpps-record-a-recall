import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { RecallJourney } from '../../../@types/journeys'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { Page } from '../../../services/auditService'
import RecallService from '../../../services/recallService'

export default class StartCreateRecallJourneyController implements Controller {
  public PAGE_NAME = Page.START_CREATE_RECALL

  constructor(
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
    private readonly recallService: RecallService,
  ) {}

  private MAX_JOURNEYS = 5

  GET = async (req: Request<{ nomsId: string }>, res: Response): Promise<void> => {
    const { username } = req.user
    const { nomsId } = req.params
    const prisonerHasSentences = await this.recallService.hasSentences(nomsId, username)
    if (!prisonerHasSentences) {
      return res.redirect(RecallJourneyUrls.noSentencesFoundIntercept(nomsId))
    }

    // Fix the 'many charges' NOMIS data issue on the start of the create journey, this fixes for all court cases related to the prisoner
    await this.recallService.fixManyCharges(nomsId, username)

    const crdsValidationResult = await this.calculateReleaseDatesService.validateForRecordARecall(nomsId, username)
    const journey: RecallJourney = {
      id: uuidv4(),
      lastTouched: new Date().toISOString(),
      isCheckingAnswers: false,
      nomsId,
      crdsValidationResult,
    }
    if (!req.session.recallJourneys) {
      req.session.recallJourneys = {}
    }
    req.session.recallJourneys[journey.id] = journey
    if (Object.entries(req.session.recallJourneys).length > this.MAX_JOURNEYS) {
      Object.values(req.session.recallJourneys)
        .sort(
          (a: RecallJourney, b: RecallJourney) => new Date(b.lastTouched).getTime() - new Date(a.lastTouched).getTime(),
        )
        .slice(this.MAX_JOURNEYS)
        .forEach(journeyToRemove => delete req.session.recallJourneys![journeyToRemove.id])
    }
    if (crdsValidationResult.criticalValidationMessages.length) {
      return res.redirect(RecallJourneyUrls.criticalValidationIntercept(nomsId, journey.id, 'create', null))
    }
    return res.redirect(RecallJourneyUrls.revocationDate(nomsId, journey.id, 'create', null))
  }
}
