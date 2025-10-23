import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { PersonJourneyParams } from '../../../@types/journeys'
import GlobalRecallUrls from '../../globalRecallUrls'
import CreateRecallUrls from '../createRecallUrls'
import { RevocationDateForm } from '../../common/revocation-date/revocationDateSchemas'

export default class CreateRecallRevocationDateController implements Controller {
  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner, formResponses } = res.locals
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!
    let backLink: string
    if (journey.isCheckingAnswers) {
      backLink = CreateRecallUrls.checkAnswers(nomsId, journeyId)
    } else {
      backLink = GlobalRecallUrls.home(nomsId)
    }
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
      return res.redirect(CreateRecallUrls.checkAnswers(nomsId, journeyId))
    }
    return res.redirect(CreateRecallUrls.returnToCustodyDate(nomsId, journeyId))
  }

}
