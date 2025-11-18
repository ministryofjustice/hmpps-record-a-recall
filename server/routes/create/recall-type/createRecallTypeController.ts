import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { PersonJourneyParams } from '../../../@types/journeys'
import RecallJourneyUrls from '../createRecallUrls'
import { Page } from '../../../services/auditService'
import { RecallTypes } from '../../../@types/recallTypes'
import { RecallTypeForm } from '../../common/recall-type/recallTypeSchema'

export default class CreateRecallTypeController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_TYPE_AUTOMATED

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner, formResponses } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!
    let backLink: string
    if (journey.isCheckingAnswers) {
      backLink = RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId)
    } else if (journey.calculationRequestId) {
      backLink = RecallJourneyUrls.reviewSentencesAutomatedJourney(nomsId, journeyId, createOrEdit, recallId)
    } else {
      backLink = RecallJourneyUrls.manualCheckSentences(nomsId, journeyId, createOrEdit, recallId)
    }
    const cancelUrl = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.recallType.name,
    )

    const recallType = formResponses?.recallType ?? journey.recallType
    // Build recall type options
    const recallTypeOptions = Object.values(RecallTypes).map(({ code, description }) => ({
      id: `recallType-${code}`,
      value: code,
      text: description,
      checked: recallType === code,
    }))

    return res.render('pages/recall/recall-type', {
      prisoner,
      pageCaption: 'Record a recall',
      recallTypeOptions,
      backLink,
      cancelUrl,
    })
  }

  POST = async (req: Request<PersonJourneyParams, unknown, RecallTypeForm>, res: Response): Promise<void> => {
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]!
    const { recallType } = req.body
    journey.recallType = recallType
    return res.redirect(RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId))
  }
}
