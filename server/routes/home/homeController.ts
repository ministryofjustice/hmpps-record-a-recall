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

    const fromUnknownPreRecallJourney = req.query?.unknownPreRecallJourney === 'true'

    const serviceDefinitions = await this.courtCasesReleaseDatesService.getServiceDefinitions(nomsId, user.token)

    const recalls = await this.recallService
      .getRecallsForPrisoner(nomsId, user.username)
      .then(it =>
        it.sort((a, b) => new Date(b.createdAtTimestamp).getTime() - new Date(a.createdAtTimestamp).getTime()),
      )

    const auditDetails = this.extractRecallUuids(recalls)

    await this.auditService.logHomePageViewEvent(user.username, nomsId, req.id, auditDetails)

    return res.render('pages/person/home', {
      recalls,
      prisoner,
      nomsId,
      serviceDefinitions,
      fromUnknownPreRecallJourney,
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
