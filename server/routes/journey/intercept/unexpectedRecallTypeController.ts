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
    const journey = req.session.recallJourneys[journeyId]!
    const recallType = req.query.recallType as ApiRecallType

    if (req.query.confirm === 'true') {
      journey.recallType = recallType
      return res.redirect(RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId))
    }

    const backLink = RecallJourneyUrls.recallType(nomsId, journeyId, createOrEdit, recallId)
    const cancelLink = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.manualJourneyStart.name,
    )
    const continueLink = RecallJourneyUrls.unexpectedRecallTypeContinue(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      recallType,
    )
    return res.render('pages/recall/unexpected-recall-type', {
      prisoner,
      pageCaption: 'Record a recall',
      backLink,
      cancelLink,
      continueLink,
      recallTypeDescription: getRecallType(recallType).description,
    })
  }
}
