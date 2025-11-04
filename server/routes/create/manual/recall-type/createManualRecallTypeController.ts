import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { PersonJourneyParams } from '../../../../@types/journeys'
import CreateRecallUrls from '../../createRecallUrls'
import { Page } from '../../../../services/auditService'
import { RecallTypes } from '../../../../@types/recallTypes'
import { RecallTypeForm } from '../../../common/recall-type/recallTypeSchema'

export default class CreateManualRecallTypeController implements Controller {
  constructor() {}

  PAGE_NAME: Page = Page.CREATE_RECALL_MANAUL_SELECT_TYPE

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner, formResponses } = res.locals
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!
    let backLink: string
    if (journey.isCheckingAnswers) {
      backLink = CreateRecallUrls.manualCheckAnswers(nomsId, journeyId)
    } else {
      backLink = CreateRecallUrls.manualCheckSentences(nomsId, journeyId)
    }
    const cancelUrl = CreateRecallUrls.confirmCancel(nomsId, journeyId)

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
    const { nomsId, journeyId } = req.params
    const journey = req.session.createRecallJourneys[journeyId]!
    const { recallType } = req.body
    journey.recallType = recallType
    return res.redirect(CreateRecallUrls.manualCheckAnswers(nomsId, journeyId))
  }
}
