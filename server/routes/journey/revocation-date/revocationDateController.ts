import { Request, Response } from 'express'
import { isEqual } from 'lodash'
import { Controller } from '../../controller'
import { RecallJourney, PersonJourneyParams } from '../../../@types/journeys'
import GlobalRecallUrls from '../../globalRecallUrls'
import RecallJourneyUrls from '../recallJourneyUrls'
import { RevocationDateForm } from './revocationDateSchemas'
import { Page } from '../../../services/auditService'

export default class RevocationDateController implements Controller {
  public PAGE_NAME = Page.ENTER_REVOCATION_DATE

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner, formResponses } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!
    const backLink = this.getBackLink(journey, nomsId, journeyId, createOrEdit, recallId)
    const cancelUrl = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.revocationDate.name,
    )
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
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!
    const { day, month, year } = req.body
    const newRevocationDate = { day, month, year }

    if (journey.isCheckingAnswers && isEqual(newRevocationDate, journey.revocationDate)) {
      return res.redirect(RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId))
    }
    journey.revocationDate = { day, month, year }
    journey.isCheckingAnswers = false
    if (journey.isCheckingAnswers && isEqual(newRevocationDate, journey.revocationDate)) {
      return res.redirect(RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId))
    }
    return res.redirect(RecallJourneyUrls.returnToCustodyDate(nomsId, journeyId, createOrEdit, recallId))
  }

  private getBackLink(
    journey: RecallJourney,
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
  ) {
    if (journey.isCheckingAnswers) {
      return RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId)
    }
    return GlobalRecallUrls.home(nomsId)
  }
}
