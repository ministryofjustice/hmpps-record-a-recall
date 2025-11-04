import { Request, Response } from 'express'
import { Controller } from '../../controller'
import CreateRecallUrls from '../createRecallUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import { datePartsToDate } from '../../../utils/utils'

export default class CreateRecallConflictingAdjustmentsController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_CONFLICTING_ADJUSTMENTS_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!

    if (!journey.revocationDate || journey.inCustodyAtRecall === undefined) {
      return res.redirect(CreateRecallUrls.start(nomsId))
    }

    const backLink = CreateRecallUrls.returnToCustodyDate(nomsId, journeyId)
    const cancelLink = CreateRecallUrls.confirmCancel(nomsId, journeyId)
    const revocationDateLink = CreateRecallUrls.revocationDate(nomsId, journeyId)
    const returnToCustodyDateLink = CreateRecallUrls.returnToCustodyDate(nomsId, journeyId)
    return res.render('pages/recall/conflicting-adjustments-intercept', {
      prisoner,
      pageCaption: 'Record a recall',
      messages: journey.crdsValidationResult.criticalValidationMessages.map(it => it.message),
      backLink,
      cancelLink,
      revocationDateLink,
      returnToCustodyDateLink,
      revocationDate: datePartsToDate(journey.revocationDate),
      returnToCustodyDate: journey.inCustodyAtRecall ? null : datePartsToDate(journey.returnToCustodyDate),
    })
  }
}
