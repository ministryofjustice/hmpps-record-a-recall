import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { PersonJourneyParams } from '../../../../@types/journeys'
import RecallJourneyUrls from '../../recallJourneyUrls'
import { Page } from '../../../../services/auditService'
import { manualJourneyReset, resetCheckingAnswers } from '../../recallJourneyOperations'

export default class ManualJourneyInterceptController implements Controller {
  public PAGE_NAME = Page.MANUAL_INTERCEPT

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

    manualJourneyReset(journey)

    return res.redirect(RecallJourneyUrls.manualSelectCases(nomsId, journeyId, createOrEdit, recallId))
  }
}
