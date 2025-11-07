import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { PersonJourneyParams } from '../../../../@types/journeys'
import CreateRecallUrls from '../../createRecallUrls'
import { Page } from '../../../../services/auditService'

export default class ManualJourneyInterceptController implements Controller {
  public PAGE_NAME = Page.CREATE_RECALL_MANUAL_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId } = req.params

    const cancelUrl = CreateRecallUrls.confirmCancel(nomsId, journeyId)
    return res.render('pages/recall/manual/manual-recall-intercept', {
      prisoner,
      backLink: CreateRecallUrls.returnToCustodyDate(nomsId, journeyId),
      cancelUrl,
    })
  }

  POST = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]

    // The absence of a calculationRequestId implies manual journey
    delete journey.calculationRequestId
    // If the user navigated here from check your-answers then they must repeat full journey
    journey.isCheckingAnswers = false

    return res.redirect(CreateRecallUrls.manualSelectCases(nomsId, journeyId))
  }
}
