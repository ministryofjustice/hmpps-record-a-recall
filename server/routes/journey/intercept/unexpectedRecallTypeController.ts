import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import { getRecallType } from '../../../@types/recallTypes'
import { ApiRecallType } from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class UnexpectedRecallTypeController implements Controller {
  PAGE_NAME: Page = Page.UNEXPECTED_RECALL_TYPE_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const recallType = req.query.recallType as ApiRecallType

    const backLink = RecallJourneyUrls.recallType(nomsId, journeyId, createOrEdit, recallId)
    const cancelLink = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.manualJourneyStart.name,
    )
    return res.render('pages/recall/unexpected-recall-type', {
      prisoner,
      pageCaption: 'Record a recall',
      backLink,
      cancelLink,
      recallType,
      recallTypeDescription: getRecallType(recallType).description,
    })
  }

  POST = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!
    journey.recallType = req.body.recallType as ApiRecallType
    return res.redirect(RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId))
  }
}
