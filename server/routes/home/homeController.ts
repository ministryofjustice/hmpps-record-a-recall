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

    res.locals.recallIds = recalls.map(recall => recall.recallUuid)

    await this.auditService.logHomePageViewEvent(
      user.username,
      nomsId,
      req.id,
      recalls.map(recall => recall.recallUuid),
    )

    return res.render('pages/person/home', {
      recalls,
      prisoner,
      nomsId,
      serviceDefinitions,
      fromUnknownPreRecallJourney,
    })
  }
}
