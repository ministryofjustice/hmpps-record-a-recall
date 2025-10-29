import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { PersonJourneyParams } from '../../../../@types/journeys'
import GlobalRecallUrls from '../../../globalRecallUrls'
import CreateRecallUrls from '../../createRecallUrls'
import { Page } from '../../../../services/auditService'
import logger from '../../../../../logger'

export default class ManualJourneyInterceptController implements Controller {
  public PAGE_NAME = Page.CREATE_RECALL_MANUAL_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]

    if (!journey) {
      return res.redirect(CreateRecallUrls.start(nomsId))
    }

    const cancelUrl = CreateRecallUrls.confirmCancel(nomsId, journeyId)
    return res.render('pages/recall/manual-recall-intercept', {
      prisoner,
      backLink: journey.isCheckingAnswers
        ? CreateRecallUrls.checkAnswers(nomsId, journeyId)
        : GlobalRecallUrls.home(nomsId),
      cancelUrl,
      continueUrl: CreateRecallUrls.manualSelectCases(nomsId, journeyId),
    })
  }

  POST = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]

    if (!journey) {
      logger.warn(`Manual journey POST called with no session journey for ${journeyId}`)
      return res.redirect(CreateRecallUrls.start(nomsId))
    }

    journey.isManual = true
    journey.lastTouched = new Date().toISOString()

    logger.info(`Manual recall flag set for NOMS ID: ${nomsId}, journeyId: ${journeyId}`)

    const nextPath = journey.isCheckingAnswers
      ? CreateRecallUrls.checkAnswers(nomsId, journeyId)
      : CreateRecallUrls.manualSelectCases(nomsId, journeyId)

    return res.redirect(nextPath)
  }
}
