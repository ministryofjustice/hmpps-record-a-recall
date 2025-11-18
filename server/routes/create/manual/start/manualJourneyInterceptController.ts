import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { PersonJourneyParams } from '../../../../@types/journeys'
import RecallJourneyUrls from '../../createRecallUrls'
import { Page } from '../../../../services/auditService'

export default class ManualJourneyInterceptController implements Controller {
  public PAGE_NAME = Page.CREATE_RECALL_MANUAL_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params

    const cancelUrl = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.manualJourneyStart.name,
    )
    return res.render('pages/recall/manual/manual-recall-intercept', {
      prisoner,
      backLink: RecallJourneyUrls.returnToCustodyDate(nomsId, journeyId, createOrEdit, recallId),
      cancelUrl,
    })
  }

  POST = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]

    // The absence of a calculationRequestId implies manual journey
    delete journey.calculationRequestId
    // If the user navigated here from check your-answers then they must repeat full journey
    journey.isCheckingAnswers = false

    return res.redirect(RecallJourneyUrls.manualSelectCases(nomsId, journeyId, createOrEdit, recallId))
  }
}
