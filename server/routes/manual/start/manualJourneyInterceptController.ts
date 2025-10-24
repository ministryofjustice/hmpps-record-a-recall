import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { PersonJourneyParams } from '../../../@types/journeys'
import GlobalRecallUrls from '../../globalRecallUrls'
import CreateRecallUrls from '../../create/createRecallUrls'
import { Page } from '../../../services/auditService'

export default class ManualJourneyInterceptController implements Controller {
  public PAGE_NAME = Page.CREATE_RECALL_MANUAL_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]

    const cancelUrl = CreateRecallUrls.confirmCancel(nomsId, journeyId)
    return res.render('pages/recall/manual-recall-intercept', {
      prisoner,
      backLink: journey.isCheckingAnswers
        ? CreateRecallUrls.checkAnswers(nomsId, journeyId)
        : GlobalRecallUrls.home(nomsId),
      cancelUrl,
      continueUrl: `/person/${nomsId}/recall/create/${journeyId}/manual/select-cases`,
    })
  }
}
