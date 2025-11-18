import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../createRecallUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import config from '../../../config'
import GlobalRecallUrls from '../../globalRecallUrls'

export default class CreateRecallCriticalValidationController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_CRITICAL_VALIDATION_INTERCEPT

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
      pageCaption: 'Record a recall',
      messages: journey.crdsValidationResult.criticalValidationMessages.map(it => it.message),
      rasDashboardUrl: `${config.urls.remandAndSentencing}/person/${nomsId}`,
      backLink,
    })
  }
}
