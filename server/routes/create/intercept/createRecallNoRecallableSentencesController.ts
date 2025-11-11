import { Request, Response } from 'express'
import { Controller } from '../../controller'
import CreateRecallUrls from '../createRecallUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import { datePartsToDate } from '../../../utils/utils'

export default class CreateRecallNoRecallableSentencesController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_NO_RECALLABLE_SENTENCES_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!

    if (!journey.revocationDate || journey.inCustodyAtRecall === undefined) {
      return res.redirect(CreateRecallUrls.start(nomsId))
    }

    const backLink = CreateRecallUrls.returnToCustodyDate(nomsId, journeyId)
    const cancelLink = CreateRecallUrls.confirmCancel(nomsId, journeyId, CreateRecallUrls.manualJourneyStart.name)
    const revocationDateLink = CreateRecallUrls.revocationDate(nomsId, journeyId)
    return res.render('pages/recall/no-recallable-sentences', {
      prisoner,
      pageCaption: 'Record a recall',
      messages: journey.crdsValidationResult.criticalValidationMessages.map(it => it.message),
      backLink,
      cancelLink,
      revocationDateLink,
      revocationDate: datePartsToDate(journey.revocationDate),
    })
  }
}
