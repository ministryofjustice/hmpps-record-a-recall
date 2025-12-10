import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { RecallJourney, PersonJourneyParams } from '../../../@types/journeys'
import RecallJourneyUrls from '../recallJourneyUrls'
import { ReturnToCustodyDateForm } from './returnToCustodyDateSchemas'
import { Page } from '../../../services/auditService'
import { capitaliseFirstLetter } from '../../../utils/utils'

export default class ReturnToCustodyDateController implements Controller {
  PAGE_NAME: Page = Page.ENTER_RETURN_TO_CUSTODY_DATE

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
      RecallJourneyUrls.returnToCustodyDate.name,
    )
    const day = formResponses?.day ?? journey.returnToCustodyDate?.day
    const month = formResponses?.month ?? journey.returnToCustodyDate?.month
    const year = formResponses?.year ?? journey.returnToCustodyDate?.year
    const inCustodyAtRecall = formResponses?.inCustodyAtRecall ?? journey.inCustodyAtRecall
    const prisonerName = `${capitaliseFirstLetter(prisoner.firstName)} ${capitaliseFirstLetter(prisoner.lastName)}`

    return res.render('pages/recall/return-to-custody-date', {
      prisoner,
      prisonerName,
      isEdit: createOrEdit === 'edit',
      day,
      month,
      year,
      inCustodyAtRecall,
      backLink,
      cancelUrl,
    })
  }

  POST = async (req: Request<PersonJourneyParams, unknown, ReturnToCustodyDateForm>, res: Response): Promise<void> => {
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!
    const { day, month, year, inCustodyAtRecall } = req.body
    journey.inCustodyAtRecall = inCustodyAtRecall
    journey.returnToCustodyDate = { day, month, year }
    if (journey.isCheckingAnswers) {
      return res.redirect(RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId))
    }
    return res.redirect(RecallJourneyUrls.decisionEndpoint(nomsId, journeyId, createOrEdit, recallId))
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
    return RecallJourneyUrls.revocationDate(nomsId, journeyId, createOrEdit, recallId)
  }
}
