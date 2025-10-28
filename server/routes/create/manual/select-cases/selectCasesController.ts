import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { PersonJourneyParams } from '../../../../@types/journeys'
import CreateRecallUrls from '../../createRecallUrls'
import { Page } from '../../../../services/auditService'
import RecallService from '../../../../services/recallService'

export default class SelectCasesController implements Controller {
  public PAGE_NAME = Page.CREATE_RECALL_MANUAL_SELECT_CASES

  constructor(private readonly recallService: RecallService) {}

  GET = async (req: Request<PersonJourneyParams & { caseIndex?: string }>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId, caseIndex } = req.params
    const journey = req.session.createRecallJourneys[journeyId]

    if (!journey.recallableCourtCases) {
      journey.recallableCourtCases = await this.recallService.getRecallableCourtCases(nomsId)
    }

    const cases = journey.recallableCourtCases
    const currentCaseIndex = Number(caseIndex) || 0

    const currentCase = cases[currentCaseIndex]

    return res.render('pages/recall/select-court-cases', {
      prisoner,
      currentCase,
      currentCaseIndex,
      totalCases: cases.length,
      cancelUrl: CreateRecallUrls.confirmCancel(nomsId, journeyId),
    })
  }

  // TODO POST method to be implemented
}
