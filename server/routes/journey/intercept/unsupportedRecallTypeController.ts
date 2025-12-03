import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import { getRecallType } from '../../../@types/recallTypes'

export default class UnsupportedRecallTypeController implements Controller {
  PAGE_NAME: Page = Page.UNSUPPORTED_RECALL_TYPE_INTERCEPT

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
    return res.render('pages/recall/unsupported-recall-type', {
      prisoner,
      pageCaption: 'Record a recall',
      backLink,
      cancelLink,
      updateRecallTypeLink: backLink,
      recallTypeDescription: getRecallType(journey.recallType).description,
    })
  }
}
