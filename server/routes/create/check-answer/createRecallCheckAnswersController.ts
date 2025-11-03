import { Request, Response } from 'express'
import { Controller } from '../../controller'
import CreateRecallUrls from '../createRecallUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import RecallService from '../../../services/recallService'
import { calculateUal } from '../../../utils/utils'
import { RecallTypes } from '../../../@types/recallTypes'

export default class CreateRecallCheckAnswersController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_CHECK_ANSWERS

  constructor(private readonly recallService: RecallService) {}

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { username } = req.user
    const { prisoner } = res.locals
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!

    if (
      !journey.revocationDate ||
      journey.inCustodyAtRecall === undefined ||
      !journey.recallType ||
      !journey.sentenceIds?.length
    ) {
      return res.redirect(CreateRecallUrls.start(nomsId))
    }

    journey.isCheckingAnswers = true

    const backLink = CreateRecallUrls.recallType(nomsId, journeyId)
    const cancelUrl = CreateRecallUrls.confirmCancel(nomsId, journeyId)

    const recall = this.recallService.getApiRecallFromJourney(journey, username, prisoner?.prisonId)
    const recallTypeDescription = Object.values(RecallTypes).find(it => it.code === recall.recallTypeCode).description
    const ual = recall.inPrisonOnRevocationDate ? null : calculateUal(recall.revocationDate, recall.returnToCustodyDate)

    return res.render('pages/recall/check-answers', {
      prisoner,
      pageCaption: 'Record a recall',
      backLink,
      cancelUrl,
      recall,
      ual,
      recallTypeDescription,
      nomsId,
      journeyId,
    })
  }

  POST = async (req: Request<PersonJourneyParams, unknown, unknown>, res: Response): Promise<void> => {
    const { username } = req.user
    const { prisoner } = res.locals
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!
    const recall = this.recallService.getApiRecallFromJourney(journey, username, prisoner?.prisonId)
    const response = await this.recallService.createRecall(recall, username)

    return res.redirect(CreateRecallUrls.recallCreatedConfirmation(nomsId, response.recallUuid))
  }
}
