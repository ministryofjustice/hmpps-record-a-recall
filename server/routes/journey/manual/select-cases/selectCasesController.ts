import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { RecallJourney, PersonJourneyParams } from '../../../../@types/journeys'
import RecallJourneyUrls from '../../recallJourneyUrls'
import { Page } from '../../../../services/auditService'
import RecallService from '../../../../services/recallService'
import { SelectCourtCasesForm } from './selectCourtCasesSchema'
import { addUnique, removeItem } from '../../../../utils/utils'

export default class SelectCasesController implements Controller {
  public PAGE_NAME = Page.MANUAL_SELECT_CASES

  constructor(private readonly recallService: RecallService) {}

  GET = async (req: Request<PersonJourneyParams & { caseIndex?: string }>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { username } = req.user
    const { nomsId, journeyId, createOrEdit, recallId, caseIndex } = req.params
    const journey = req.session.recallJourneys[journeyId]

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
      cancelUrl: RecallJourneyUrls.confirmCancel(
        nomsId,
        journeyId,
        createOrEdit,
        recallId,
        RecallJourneyUrls.manualSelectCases.name,
        courtCaseIndex,
      ),
      backLink: this.getBackLink(journey, nomsId, journeyId, createOrEdit, recallId, courtCaseIndex),
    })
  }

  POST = async (
    req: Request<PersonJourneyParams & { caseIndex?: string }, unknown, SelectCourtCasesForm>,
    res: Response,
  ): Promise<void> => {
    const { nomsId, journeyId, createOrEdit, recallId, caseIndex } = req.params
    const { activeSentenceChoice } = req.body

    const journey = req.session.recallJourneys[journeyId]!
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
    return res.redirect(RecallJourneyUrls.manualCheckSentences(nomsId, journeyId, createOrEdit, recallId))
  }

  private getBackLink(
    journey: RecallJourney,
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId: string,
    courtCaseIndex: number,
  ) {
    if (journey.isCheckingAnswers) {
      return RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId)
    }

    if (courtCaseIndex > 0) {
      return RecallJourneyUrls.manualSelectCases(nomsId, journeyId, createOrEdit, recallId, courtCaseIndex - 1)
    }

    return RecallJourneyUrls.manualJourneyStart(nomsId, journeyId, createOrEdit, recallId)
  }
}
