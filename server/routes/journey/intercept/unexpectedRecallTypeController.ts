import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import { getRecallType } from '../../../@types/recallTypes'

export default class UnexpectedRecallTypeController implements Controller {
  PAGE_NAME: Page = Page.UNEXPECTED_RECALL_TYPE_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!

    const backLink = RecallJourneyUrls.recallType(nomsId, journeyId, createOrEdit, recallId)
    const cancelLink = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.manualJourneyStart.name,
    )
    const continueLink = RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId)
    return res.render('pages/recall/unexpected-recall-type', {
      prisoner,
      pageCaption: 'Record a recall',
      backLink,
      cancelLink,
      continueLink,
      recallTypeDescription: getRecallType(journey.recallType).description,
    })
  }
}
