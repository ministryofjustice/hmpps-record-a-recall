import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import CreateRecallUrls from '../../createRecallUrls'
import { PersonJourneyParams } from '../../../../@types/journeys'
import { Page } from '../../../../services/auditService'
import RecallService from '../../../../services/recallService'
import { calculateUal } from '../../../../utils/utils'
import { RecallTypes } from '../../../../@types/recallTypes'

export default class CreateManualRecallCheckAnswersController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_MANUAL_CHECK_ANSWERS

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

    const backLink = CreateRecallUrls.manualSelectRecallType(nomsId, journeyId)
    const cancelUrl = CreateRecallUrls.confirmCancel(nomsId, journeyId, CreateRecallUrls.manualCheckAnswers.name)

    const recall = this.recallService.getApiRecallFromJourney(journey, username, prisoner?.prisonId)
    const recallTypeDescription = Object.values(RecallTypes).find(it => it.code === recall.recallTypeCode).description
    const ual = recall.inPrisonOnRevocationDate ? null : calculateUal(recall.revocationDate, recall.returnToCustodyDate)

    return res.render('pages/recall/manual/manual-check-answers', {
      prisoner,
      pageCaption: 'Record a recall',
      backLink,
      cancelUrl,
      recall,
      courtCasesCount: journey.courtCaseIdsSelectedForRecall.length,
      ual,
      recallTypeDescription,
      nomsId,
      journeyId,
      urls: this.buildUrls(nomsId, journeyId),
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

  private buildUrls(nomsId: string, journeyId: string) {
    return {
      revocationDate: CreateRecallUrls.revocationDate(nomsId, journeyId),
      returnToCustodyDate: CreateRecallUrls.returnToCustodyDate(nomsId, journeyId),
      manualSelectCases: CreateRecallUrls.manualSelectCases(nomsId, journeyId),
      manualCheckSentences: CreateRecallUrls.manualCheckSentences(nomsId, journeyId),
      manualSelectRecallType: CreateRecallUrls.manualSelectRecallType(nomsId, journeyId),
    }
  }
}
