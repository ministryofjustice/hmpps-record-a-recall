import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import GlobalRecallUrls from '../../globalRecallUrls'
import OtherServiceUrls from '../../otherServiceUrls'

export default class CriticalValidationController implements Controller {
  PAGE_NAME: Page = Page.CRITICAL_VALIDATION_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!

    if (!journey.crdsValidationResult.criticalValidationMessages?.length) {
      return res.redirect(RecallJourneyUrls.start(nomsId, createOrEdit, recallId))
    }

    const backLink = GlobalRecallUrls.home(nomsId)
    return res.render('pages/recall/critical-validation-errors', {
      prisoner,
      messages: journey.crdsValidationResult.criticalValidationMessages.map(it => it.message),
      rasDashboardUrl: OtherServiceUrls.rasDashboard(nomsId),
      backLink,
    })
  }
}
