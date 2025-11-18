import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import RecallService from '../../../services/recallService'
import { calculateUal } from '../../../utils/utils'
import { RecallTypes } from '../../../@types/recallTypes'
import GlobalRecallUrls from '../../globalRecallUrls'
import { CreateRecall } from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class CheckAnswersController implements Controller {
  PAGE_NAME: Page = Page.CHECK_ANSWERS

  constructor(private readonly recallService: RecallService) {}

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { username } = req.user
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!

    if (
      !journey.revocationDate ||
      journey.inCustodyAtRecall === undefined ||
      !journey.recallType ||
      !journey.sentenceIds?.length
    ) {
      return res.redirect(RecallJourneyUrls.start(nomsId, createOrEdit, recallId))
    }

    journey.isCheckingAnswers = true

    let backLink: string
    if (createOrEdit === 'create') {
      backLink = RecallJourneyUrls.recallType(nomsId, journeyId, createOrEdit, recallId)
    } else {
      backLink = GlobalRecallUrls.home(nomsId)
    }

    const cancelUrl = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.checkAnswers.name,
    )

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
      createOrEdit,
      courtCasesCount:
        !recall.calculationRequestId && journey.courtCaseIdsSelectedForRecall?.length
          ? journey.courtCaseIdsSelectedForRecall?.length
          : 0,
      recallBeingEditted: journey.recallBeingEditted,
      urls: this.buildUrls(nomsId, journeyId, createOrEdit, recallId, recall),
    })
  }

  private buildUrls(
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
    recall: CreateRecall,
  ) {
    return {
      revocationDate: RecallJourneyUrls.revocationDate(nomsId, journeyId, createOrEdit, recallId),
      returnToCustodyDate: RecallJourneyUrls.returnToCustodyDate(nomsId, journeyId, createOrEdit, recallId),
      reviewSentences: recall.calculationRequestId
        ? RecallJourneyUrls.reviewSentencesAutomatedJourney(nomsId, journeyId, createOrEdit, recallId)
        : RecallJourneyUrls.manualCheckSentences(nomsId, journeyId, createOrEdit, recallId),
      manualSelectCases: recall.calculationRequestId
        ? null
        : RecallJourneyUrls.manualSelectCases(nomsId, journeyId, createOrEdit, recallId),
      recallType: RecallJourneyUrls.recallType(nomsId, journeyId, createOrEdit, recallId),
    }
  }

  POST = async (req: Request<PersonJourneyParams, unknown, unknown>, res: Response): Promise<void> => {
    const { username } = req.user
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!
    const recall = this.recallService.getApiRecallFromJourney(journey, username, prisoner?.prisonId)
    let responseId = recallId
    if (createOrEdit === 'create') {
      responseId = (await this.recallService.createRecall(recall, username)).recallUuid
    } else {
      await this.recallService.editRecall(recallId, recall, username)
    }

    return res.redirect(RecallJourneyUrls.recallConfirmation(nomsId, createOrEdit, responseId))
  }
}
