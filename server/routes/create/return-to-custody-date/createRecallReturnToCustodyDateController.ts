import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { CreateRecallJourney, PersonJourneyParams } from '../../../@types/journeys'
import CreateRecallUrls from '../createRecallUrls'
import { ReturnToCustodyDateForm } from '../../common/return-to-custody-date/returnToCustodyDateSchemas'
import { Page } from '../../../services/auditService'

export default class CreateRecallReturnToCustodyDateController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_ENTER_RETURN_TO_CUSTODY_DATE

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner, formResponses } = res.locals
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!
    const backLink = this.getBackLink(journey, nomsId, journeyId)
    const cancelUrl = CreateRecallUrls.confirmCancel(nomsId, journeyId)
    const day = formResponses?.day ?? journey.returnToCustodyDate?.day
    const month = formResponses?.month ?? journey.returnToCustodyDate?.month
    const year = formResponses?.year ?? journey.returnToCustodyDate?.year
    const inCustodyAtRecall = formResponses?.inCustodyAtRecall ?? journey.inCustodyAtRecall
    return res.render('pages/recall/return-to-custody-date', {
      prisoner,
      pageCaption: 'Record a recall',
      day,
      month,
      year,
      inCustodyAtRecall,
      backLink,
      cancelUrl,
    })
  }

  POST = async (req: Request<PersonJourneyParams, unknown, ReturnToCustodyDateForm>, res: Response): Promise<void> => {
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!
    const { day, month, year, inCustodyAtRecall } = req.body
    journey.inCustodyAtRecall = inCustodyAtRecall
    journey.returnToCustodyDate = { day, month, year }
    return res.redirect(CreateRecallUrls.decisionEndpoint(nomsId, journeyId))
  }

  private getBackLink(journey: CreateRecallJourney, nomsId: string, journeyId: string) {
    if (journey.isCheckingAnswers) {
      return journey.calculationRequestId
        ? CreateRecallUrls.checkAnswers(nomsId, journeyId)
        : CreateRecallUrls.manualCheckAnswers(nomsId, journeyId)
    }
    return CreateRecallUrls.revocationDate(nomsId, journeyId)
  }
}
