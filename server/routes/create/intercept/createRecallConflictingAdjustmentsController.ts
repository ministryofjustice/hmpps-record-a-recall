import { Request, Response } from 'express'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../createRecallUrls'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import { datePartsToDate, dateToIsoString } from '../../../utils/utils'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import AdjustmentsService from '../../../services/adjustmentsService'

export default class CreateRecallConflictingAdjustmentsController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_CONFLICTING_ADJUSTMENTS_INTERCEPT

  constructor(
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
    private readonly adjustmentsService: AdjustmentsService,
  ) {}

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const { username } = req.user
    const journey = req.session.recallJourneys[journeyId]!

    if (!journey.revocationDate || journey.inCustodyAtRecall === undefined) {
      return res.redirect(RecallJourneyUrls.start(nomsId, createOrEdit, recallId))
    }

    const decision = await this.calculateReleaseDatesService.makeDecisionForRecordARecall(
      nomsId,
      {
        revocationDate: dateToIsoString(datePartsToDate(journey.revocationDate)),
      },
      username,
    )

    if (decision.decision !== 'CONFLICTING_ADJUSTMENTS') {
      return res.redirect(RecallJourneyUrls.decisionEndpoint(nomsId, journeyId, createOrEdit, recallId))
    }

    const adjustments = await Promise.all(
      decision.conflictingAdjustments.map(id => this.adjustmentsService.getAdjustmentById(id, username)),
    )

    const backLink = RecallJourneyUrls.returnToCustodyDate(nomsId, journeyId, createOrEdit, recallId)
    const cancelLink = RecallJourneyUrls.confirmCancel(
      nomsId,
      journeyId,
      createOrEdit,
      recallId,
      RecallJourneyUrls.conflictingAdjustmentsIntercept.name,
    )
    const revocationDateLink = RecallJourneyUrls.revocationDate(nomsId, journeyId, createOrEdit, recallId)
    const returnToCustodyDateLink = RecallJourneyUrls.returnToCustodyDate(nomsId, journeyId, createOrEdit, recallId)
    return res.render('pages/recall/conflicting-adjustments-intercept', {
      prisoner,
      pageCaption: 'Record a recall',
      messages: journey.crdsValidationResult.criticalValidationMessages.map(it => it.message),
      backLink,
      cancelLink,
      revocationDateLink,
      returnToCustodyDateLink,
      revocationDate: datePartsToDate(journey.revocationDate),
      returnToCustodyDate: journey.inCustodyAtRecall ? null : datePartsToDate(journey.returnToCustodyDate),
      adjustments,
    })
  }
}
