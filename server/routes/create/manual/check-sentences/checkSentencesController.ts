import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { PersonJourneyParams } from '../../../../@types/journeys'
import CreateRecallUrls from '../../createRecallUrls'
import { Page } from '../../../../services/auditService'
import RecallService from '../../../../services/recallService'
import CalculateReleaseDatesService from '../../../../services/calculateReleaseDatesService'
import CourtCasesReleaseDatesService from '../../../../services/courtCasesReleaseDatesService'

export default class CheckSentencesController implements Controller {
  constructor(
    private readonly recallService: RecallService,
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
    private readonly courtCasesReleaseDatesService: CourtCasesReleaseDatesService,
  ) {}

  public PAGE_NAME = Page.CREATE_RECALL_MANUAL_CHECK_SENTENCES

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner, user } = res.locals
    const { nomsId, journeyId } = req.params
    const serviceDefinitions = await this.courtCasesReleaseDatesService.getServiceDefinitions(nomsId, user.token)

    const journey = req.session.createRecallJourneys[journeyId]

    const licenceExpiryDate = await this.calculateReleaseDatesService.getLedFromLatestCalc(nomsId)
    const casesSelectedForRecall = this.recallService.getCasesSelectedForRecall(journey)

    return res.render('pages/recall/manual/check-sentences', {
      prisoner,
      casesSelectedForRecall,
      licenceExpiryDate,
      cancelUrl: CreateRecallUrls.confirmCancel(nomsId, journeyId),
      serviceDefinitions,
    })
  }

  POST = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]
    const { courtCaseIdsSelectedForRecall } = journey
    const casesSelectedForRecall = journey.recallableCourtCases.filter(c =>
      courtCaseIdsSelectedForRecall.includes(c.courtCaseUuid),
    )
    journey.sentenceIds = casesSelectedForRecall.flatMap(c => (c.recallableSentences ?? []).map(s => s.sentenceUuid))
    return res.redirect(CreateRecallUrls.manualSelectRecallType(nomsId, journeyId))
  }
}
