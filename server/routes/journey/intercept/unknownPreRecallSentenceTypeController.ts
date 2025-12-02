import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import config from '../../../config'

export default class UnknownPreRecallSentenceTypeController implements Controller {
  PAGE_NAME: Page = Page.UNKNOWN_PRE_RECALL_SENTENCE_TYPE_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params

    const backLink = RecallJourneyUrls.recallType(nomsId, journeyId, createOrEdit, recallId)
    const cancelLink = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.manualJourneyStart.name,
    )
    const continueLink = `${config.urls.remandAndSentencing}/person/${nomsId}`
    return res.render('pages/recall/unknown-pre-recall-type', {
      prisoner,
      pageCaption: 'Record a recall',
      backLink,
      continueLink,
      cancelLink,
    })
  }
}
