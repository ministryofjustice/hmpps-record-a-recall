import { Request, Response } from 'express'
import { Controller } from '../../../controller'
import { RecallJourney, PersonJourneyParams } from '../../../../@types/journeys'
import RecallJourneyUrls from '../../recallJourneyUrls'
import { Page } from '../../../../services/auditService'
import RecallService from '../../../../services/recallService'
import CalculateReleaseDatesService from '../../../../services/calculateReleaseDatesService'
import CourtCasesReleaseDatesService from '../../../../services/courtCasesReleaseDatesService'

export default class CheckSentencesController implements Controller {
  constructor(
    private readonly recallService: RecallService,
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
    private readonly courtCasesReleaseDatesService: CourtCasesReleaseDatesService,
  ) {}

  public PAGE_NAME = Page.MANUAL_CHECK_SENTENCES

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner, user } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const serviceDefinitions = await this.courtCasesReleaseDatesService.getServiceDefinitions(nomsId, user.token)

    const journey = req.session.recallJourneys[journeyId]

    const licenceDates = await this.calculateReleaseDatesService.getLicenceDatesFromLatestCalc(nomsId)
    const casesSelectedForRecall = this.recallService.getCasesSelectedForRecall(journey)

    return res.render('pages/recall/manual/check-sentences', {
      prisoner,
      isEdit: createOrEdit === 'edit',
      casesSelectedForRecall,
      licenceDates,
      cancelUrl: RecallJourneyUrls.confirmCancel(
        nomsId,
        journeyId,
        createOrEdit,
        recallId,
        RecallJourneyUrls.manualCheckSentences.name,
      ),
      serviceDefinitions,
      backLink: this.getBackLink(journey, nomsId, journeyId, createOrEdit, recallId),
    })
  }

  POST = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const journey = req.session.recallJourneys[journeyId]
    const { courtCaseIdsSelectedForRecall } = journey
    const casesSelectedForRecall = journey.recallableCourtCases.filter(c =>
      courtCaseIdsSelectedForRecall.includes(c.courtCaseUuid),
    )
    journey.sentenceIds = casesSelectedForRecall.flatMap(c => (c.recallableSentences ?? []).map(s => s.sentenceUuid))
    if (journey.isCheckingAnswers) {
      return res.redirect(RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId))
    }

    return res.redirect(RecallJourneyUrls.recallType(nomsId, journeyId, createOrEdit, recallId))
  }

  private getBackLink(
    journey: RecallJourney,
    nomsId: string,
    journeyId: string,
    createOrEdit: 'edit' | 'create',
    recallId?: string,
  ) {
    const lastCaseIndex = journey.recallableCourtCases.length - 1
    if (journey.isCheckingAnswers) {
      return RecallJourneyUrls.checkAnswers(nomsId, journeyId, createOrEdit, recallId)
    }

    return RecallJourneyUrls.manualSelectCases(nomsId, journeyId, createOrEdit, recallId, lastCaseIndex)
  }
}
