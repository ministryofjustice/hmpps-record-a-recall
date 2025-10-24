import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { PersonJourneyParams } from '../../../@types/journeys'
import GlobalRecallUrls from '../../globalRecallUrls'
import CreateRecallUrls from '../../create/createRecallUrls'

export default class ManualJourneyInterceptController implements Controller {
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
