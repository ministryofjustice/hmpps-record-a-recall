import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { CreateRecallJourney, PersonJourneyParams } from '../../../../@types/journeys'
import CreateRecallUrls from '../../createRecallUrls'
import { Page } from '../../../../services/auditService'
import RecallService from '../../../../services/recallService'
import { SelectCourtCasesForm } from '../../../common/select-court-cases/selectCourtCasesSchema'
import { addUnique, removeItem } from '../../../../utils/utils'

export default class SelectCasesController implements Controller {
  public PAGE_NAME = Page.CREATE_RECALL_MANUAL_SELECT_CASES

  constructor(private readonly recallService: RecallService) {}

  GET = async (req: Request<PersonJourneyParams & { caseIndex?: string }>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { username } = req.user
    const { nomsId, journeyId, caseIndex } = req.params
    const journey = req.session.createRecallJourneys[journeyId]

    if (!journey.recallableCourtCases) {
      journey.recallableCourtCases = await this.recallService.getRecallableCourtCases(nomsId, username)
    }

    const cases = journey.recallableCourtCases
    const courtCaseIndex = Number(caseIndex) || 0
    const courtCase = cases[courtCaseIndex]

    let selectedRadio: 'YES' | 'NO' | undefined

    if (journey.courtCaseIdsSelectedForRecall?.includes(courtCase.courtCaseUuid)) {
      selectedRadio = 'YES'
    } else if (journey.courtCaseIdsExcludedFromRecall?.includes(courtCase.courtCaseUuid)) {
      selectedRadio = 'NO'
    }

    return res.render('pages/recall/manual/select-court-cases', {
      prisoner,
      courtCase,
      courtCaseIndex,
      totalCases: cases.length,
      selectedRadio,
      cancelUrl: CreateRecallUrls.confirmCancel(nomsId, journeyId),
      backLink: this.getBackLink(journey, nomsId, journeyId, courtCaseIndex),
    })
  }

  POST = async (
    req: Request<PersonJourneyParams & { caseIndex?: string }, unknown, SelectCourtCasesForm>,
    res: Response,
  ): Promise<void> => {
    const { nomsId, journeyId, caseIndex } = req.params
    const { activeSentenceChoice } = req.body

    const journey = req.session.createRecallJourneys[journeyId]!
    const cases = journey.recallableCourtCases ?? []

    const currentCaseIndex = Number(caseIndex) || 0
    const hasNextCase = currentCaseIndex + 1 < cases.length
    const nextCaseIndex = currentCaseIndex + 1
    const currentCaseUuid = cases[currentCaseIndex].courtCaseUuid

    journey.courtCaseIdsSelectedForRecall ??= []
    journey.courtCaseIdsExcludedFromRecall ??= []

    if (activeSentenceChoice === 'YES') {
      journey.courtCaseIdsSelectedForRecall = addUnique(journey.courtCaseIdsSelectedForRecall, currentCaseUuid)
      journey.courtCaseIdsExcludedFromRecall = removeItem(journey.courtCaseIdsExcludedFromRecall, currentCaseUuid)
    } else {
      journey.courtCaseIdsSelectedForRecall = removeItem(journey.courtCaseIdsSelectedForRecall, currentCaseUuid)
      journey.courtCaseIdsExcludedFromRecall = addUnique(journey.courtCaseIdsExcludedFromRecall, currentCaseUuid)
    }

    // Move to next case if available
    if (hasNextCase) {
      return res.redirect(`/person/${nomsId}/recall/create/${journeyId}/manual/select-court-cases/${nextCaseIndex}`)
    }

    // last case — decide final route
    return res.redirect(CreateRecallUrls.manualCheckSentences(nomsId, journeyId))
  }

  private getBackLink(journey: CreateRecallJourney, nomsId: string, journeyId: string, courtCaseIndex: number) {
    if (journey.isCheckingAnswers) {
      return CreateRecallUrls.manualCheckAnswers(nomsId, journeyId)
    }

    if (courtCaseIndex > 0) {
      return CreateRecallUrls.manualSelectCases(nomsId, journeyId, courtCaseIndex - 1)
    }

    return CreateRecallUrls.manualJourneyStart(nomsId, journeyId)
  }
}
