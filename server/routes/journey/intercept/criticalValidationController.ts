import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import GlobalRecallUrls from '../../globalRecallUrls'

export default class CriticalValidationController implements Controller {
  PAGE_NAME: Page = Page.CRITICAL_VALIDATION_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!
    const latestCriticalMessages = journey.crdsValidationResult.latestCriticalMessages ?? []
    const penultimateCriticalMessages = journey.crdsValidationResult.penultimateCriticalMessages ?? []

    if (!latestCriticalMessages.length && !penultimateCriticalMessages.length) {
      return res.redirect(RecallJourneyUrls.start(nomsId, createOrEdit, recallId))
    }

    return res.render('pages/recall/critical-validation-soft-block', {
      prisoner,
      messages: [...latestCriticalMessages, ...penultimateCriticalMessages].map(it => it.message),
      backLink: GlobalRecallUrls.home(nomsId),
      cancelUrl: RecallJourneyUrls.confirmCancel(
        nomsId,
        journeyId,
        createOrEdit,
        recallId,
        RecallJourneyUrls.criticalValidationIntercept.name,
      ),
      continueUrl:
        createOrEdit === 'edit'
          ? RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId)
          : RecallJourneyUrls.revocationDate(nomsId, journeyId, createOrEdit, recallId),
    })
  }
}
