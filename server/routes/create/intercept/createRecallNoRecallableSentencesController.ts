import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../createRecallUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import { datePartsToDate } from '../../../utils/utils'

export default class CreateRecallNoRecallableSentencesController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_NO_RECALLABLE_SENTENCES_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!

    if (!journey.revocationDate || journey.inCustodyAtRecall === undefined) {
      return res.redirect(RecallJourneyUrls.start(nomsId, createOrEdit, recallId))
    }

    const backLink = RecallJourneyUrls.returnToCustodyDate(nomsId, journeyId, createOrEdit, recallId)
    const cancelLink = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.manualJourneyStart.name,
    )
    const revocationDateLink = RecallJourneyUrls.revocationDate(nomsId, journeyId, createOrEdit, recallId)
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
