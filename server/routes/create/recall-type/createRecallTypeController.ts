import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { PersonJourneyParams } from '../../../@types/journeys'
import CreateRecallUrls from '../createRecallUrls'
import { Page } from '../../../services/auditService'
import { RecallTypes } from '../../../@types/recallTypes'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { datePartsToDate, dateToIsoString } from '../../../utils/utils'
import { RecallTypeForm } from '../../common/recall-type/recallTypeSchema'

export default class CreateRecallTypeController implements Controller {
  constructor(private readonly calculateReleaseDatesService: CalculateReleaseDatesService) {}

  PAGE_NAME: Page = Page.CREATE_RECALL_TYPE_AUTOMATED

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner, formResponses } = res.locals
    const { nomsId, journeyId } = req.params
    const { username } = req.user
    const journey = req.session.createRecallJourneys[journeyId]!
    let backLink: string
    if (journey.isCheckingAnswers) {
      backLink = CreateRecallUrls.checkAnswers(nomsId, journeyId)
    } else {
      backLink = CreateRecallUrls.reviewSentencesAutomatedJourney(nomsId, journeyId)
    }
    const cancelUrl = CreateRecallUrls.confirmCancel(nomsId, journeyId, CreateRecallUrls.recallType.name)

    const recallType = formResponses?.recallType ?? journey.recallType
    const decision = await this.calculateReleaseDatesService.makeDecisionForRecordARecall(
      nomsId,
      {
        revocationDate: dateToIsoString(datePartsToDate(journey.revocationDate)),
      },
      username,
    )
    // Build recall type options
    const recallTypeOptions = Object.values(RecallTypes)
      .filter(({ code }) => decision.automatedCalculationData.eligibleRecallTypes.includes(code))
      .map(({ code, description }) => ({
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
    return res.redirect(CreateRecallUrls.checkAnswers(nomsId, journeyId))
  }
}
