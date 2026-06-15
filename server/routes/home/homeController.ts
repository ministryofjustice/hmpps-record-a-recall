import { Request, Response } from 'express'
import { Controller } from '../controller'
import AuditService, { Page } from '../../services/auditService'
import CourtCasesReleaseDatesService from '../../services/courtCasesReleaseDatesService'
import RecallService from '../../services/recallService'

export default class HomeController implements Controller {
  constructor(
    private readonly courtCasesReleaseDatesService: CourtCasesReleaseDatesService,
    private readonly recallService: RecallService,
    private readonly auditService: AuditService,
  ) {}

  public PAGE_NAME = Page.HOME

  GET = async (req: Request<{ nomsId: string }>, res: Response): Promise<void> => {
    const { nomsId } = req.params
    const { prisoner, user } = res.locals
    const { includeRecallsFromPreviousPeriodsOfCustody } = req.query as {
      includeRecallsFromPreviousPeriodsOfCustody?: string
    }

    const fromUnknownPreRecallJourney = req.query?.unknownPreRecallJourney === 'true'
    const includeRecallsFromPreviousPeriodsOfCustodyValue = includeRecallsFromPreviousPeriodsOfCustody === 'true'

    const serviceDefinitions = await this.courtCasesReleaseDatesService.getServiceDefinitions(nomsId, user.token)

    const activeBookingId = prisoner.bookingId ?? ''

    const { recalls: displayedRecalls, prisonerRecallTotal } = await this.recallService.getRecallsForPrisoner(
      nomsId,
      user.username,
      activeBookingId,
      includeRecallsFromPreviousPeriodsOfCustodyValue,
    )

//     const aggravatingFactors = displayedRecalls.flatMap(recall =>
//   recall.courtCases.flatMap(courtCase =>
//     courtCase.sentences.map(sentence => ({
//       recallUuid: recall.recallUuid,
//       sentenceUuid: sentence.sentenceUuid,
//       isDomesticViolenceRelated: sentence.isDomesticViolenceRelated,
//       isTerrorRelated: sentence.isTerrorRelated,
//       isForeignPowerRelated: sentence.isForeignPowerRelated,
//     })),
//   ),
// )

// console.log('Aggravating factors********************:', aggravatingFactors)

    const auditDetails = this.extractRecallUuids(displayedRecalls)

    await this.auditService.logHomePageViewEvent(user.username, nomsId, req.id, auditDetails)

    const totalRecallsCount = prisonerRecallTotal
    const displayedRecallsCount = displayedRecalls.length
    const showNoRecallsInCurrentPeriodOfCustodyMessage =
      totalRecallsCount > 0 && displayedRecallsCount === 0 && !includeRecallsFromPreviousPeriodsOfCustodyValue

    return res.render('pages/person/home', {
      recalls: displayedRecalls,
      prisoner,
      nomsId,
      serviceDefinitions,
      fromUnknownPreRecallJourney,
      totalRecallsCount,
      displayedRecallsCount,
      includeRecallsFromPreviousPeriodsOfCustody: includeRecallsFromPreviousPeriodsOfCustodyValue,
      showNoRecallsInCurrentPeriodOfCustodyMessage,
      displayMaintenanceAlert: true,
    })
  }

  extractRecallUuids = recalls => {
    const recallIds = recalls.map(r => r.recallUuid)

    const courtCaseUuids = recalls.flatMap(r => r.courtCases.map(c => c.courtCaseUuid).filter(Boolean))

    const sentenceUuids = recalls.flatMap(r =>
      r.courtCases.flatMap(c => c.sentences.map(s => s.sentenceUuid).filter(Boolean)),
    )

    const periodLengthUuids = recalls.flatMap(r =>
      r.courtCases.flatMap(c => c.sentences.flatMap(s => s.periodLengths.map(p => p.periodLengthUuid).filter(Boolean))),
    )

    return {
      recallIds,
      courtCaseUuids,
      sentenceUuids,
      periodLengthUuids,
    }
  }
}
