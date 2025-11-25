import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { Controller } from '../../controller'
import RecallJourneyUrls from '../recallJourneyUrls'
import { DecoratedCourtCase, RecallJourney } from '../../../@types/journeys'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { Page } from '../../../services/auditService'
import RecallService from '../../../services/recallService'
import { dateStringToDateParts } from '../../../utils/utils'

export default class StartEditRecallJourneyController implements Controller {
  public PAGE_NAME = Page.START_EDIT_RECALL

  constructor(
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
    private readonly recallService: RecallService,
  ) {}

  private MAX_JOURNEYS = 5

  GET = async (req: Request<{ nomsId: string; recallId: string }>, res: Response): Promise<void> => {
    const { username } = req.user
    const { nomsId, recallId } = req.params
    const crdsValidationResult = await this.calculateReleaseDatesService.validateForRecordARecall(nomsId, username)
    const recall = await this.recallService.getRecall(recallId, username)

    const isManualJourney = !recall.calculationRequestId

    let courtCaseIdsSelectedForRecall: string[] = []
    let courtCaseIdsExcludedFromRecall: string[] = []
    let recallableCourtCases: DecoratedCourtCase[] = []

    if (isManualJourney) {
      courtCaseIdsSelectedForRecall = recall.courtCases.map(it => it.courtCaseUuid)

      recallableCourtCases = await this.recallService.getRecallableCourtCases(nomsId, username)

      courtCaseIdsExcludedFromRecall = recallableCourtCases
        .filter(it => !courtCaseIdsSelectedForRecall.includes(it.courtCaseUuid))
        .map(it => it.courtCaseUuid)
    }

    const journey: RecallJourney = {
      id: uuidv4(),
      lastTouched: new Date().toISOString(),
      nomsId,
      recallId,
      isCheckingAnswers: true,
      crdsValidationResult,
      revocationDate: dateStringToDateParts(recall.revocationDate),
      inCustodyAtRecall: recall.inPrisonOnRevocationDate,
      returnToCustodyDate: recall.inPrisonOnRevocationDate ? null : dateStringToDateParts(recall.returnToCustodyDate),
      recallType: recall.recallTypeCode,
      calculationRequestId: recall.calculationRequestId,
      sentenceIds: recall.sentenceIds,
      recallBeingEditted: recall,
      courtCaseIdsSelectedForRecall,
      courtCaseIdsExcludedFromRecall,
      recallableCourtCases,
    }
    if (!req.session.recallJourneys) {
      req.session.recallJourneys = {}
    }
    req.session.recallJourneys[journey.id] = journey
    if (Object.entries(req.session.recallJourneys).length > this.MAX_JOURNEYS) {
      Object.values(req.session.recallJourneys)
        .sort(
          (a: RecallJourney, b: RecallJourney) => new Date(b.lastTouched).getTime() - new Date(a.lastTouched).getTime(),
        )
        .slice(this.MAX_JOURNEYS)
        .forEach(journeyToRemove => delete req.session.recallJourneys![journeyToRemove.id])
    }
    if (crdsValidationResult.criticalValidationMessages.length) {
      res.redirect(RecallJourneyUrls.criticalValidationIntercept(nomsId, journey.id, 'edit', recallId))
    } else {
      res.redirect(RecallJourneyUrls.checkAnswers(nomsId, journey.id, 'edit', recallId))
    }
  }
}
