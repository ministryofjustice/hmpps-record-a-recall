import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { CreateRecallJourney, PersonJourneyParams } from '../../../@types/journeys'
import GlobalRecallUrls from '../../globalRecallUrls'
import CreateRecallUrls from '../createRecallUrls'
import { RevocationDateForm } from '../../common/revocation-date/revocationDateSchemas'
import { Page } from '../../../services/auditService'

export default class CreateRecallRevocationDateController implements Controller {
  public PAGE_NAME = Page.CREATE_RECALL_ENTER_REVOCATION_DATE

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner, formResponses } = res.locals
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!
    const backLink = this.getBackLink(journey, nomsId, journeyId)
    const cancelUrl = CreateRecallUrls.confirmCancel(nomsId, journeyId)
    const day = formResponses?.day ?? journey.revocationDate?.day
    const month = formResponses?.month ?? journey.revocationDate?.month
    const year = formResponses?.year ?? journey.revocationDate?.year
    return res.render('pages/recall/revocation-date', {
      prisoner,
      pageCaption: 'Record a recall',
      day,
      month,
      year,
      backLink,
      cancelUrl,
    })
  }

  POST = async (req: Request<PersonJourneyParams, unknown, RevocationDateForm>, res: Response): Promise<void> => {
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!
    const { day, month, year } = req.body
    journey.revocationDate = { day, month, year }
    if (journey.isCheckingAnswers) {
      return journey.calculationRequestId
        ? res.redirect(CreateRecallUrls.checkAnswers(nomsId, journeyId))
        : res.redirect(CreateRecallUrls.manualCheckAnswers(nomsId, journeyId))
    }
    return res.redirect(CreateRecallUrls.returnToCustodyDate(nomsId, journeyId))
  }

  private getBackLink(journey: CreateRecallJourney, nomsId: string, journeyId: string) {
    if (journey.isCheckingAnswers) {
      return journey.calculationRequestId
        ? CreateRecallUrls.checkAnswers(nomsId, journeyId)
        : CreateRecallUrls.manualCheckAnswers(nomsId, journeyId)
    }
    return GlobalRecallUrls.home(nomsId)
  }
}
