import { Request, Response } from 'express'
import { Controller } from '../controller'
import { Page } from '../../services/auditService'
import CourtCasesReleaseDatesService from '../../services/courtCasesReleaseDatesService'
import RecallService from '../../services/recallService'

export default class HomeController implements Controller {
  constructor(
    private readonly courtCasesReleaseDatesService: CourtCasesReleaseDatesService,
    private readonly recallService: RecallService,
  ) {}

  public PAGE_NAME = Page.HOME

  GET = async (req: Request<{ nomsId: string }>, res: Response): Promise<void> => {
    const { nomsId } = req.params
    const { prisoner, user } = res.locals

    const serviceDefinitions = await this.courtCasesReleaseDatesService.getServiceDefinitions(nomsId, user.token)

    const recallsFromService = await this.recallService.getRecallsForPrisoner(nomsId, user.username)

    const recalls = recallsFromService
      .sort((a, b) => new Date(b.createdAtTimestamp).getTime() - new Date(a.createdAtTimestamp).getTime())
      .map(recall => ({
        ...recall,
        courtCases: (recall.courtCases || []).sort((a, b) => {
          const dateA = a.courtCaseDate ? new Date(a.courtCaseDate).getTime() : 0
          const dateB = b.courtCaseDate ? new Date(b.courtCaseDate).getTime() : 0

          return dateB - dateA
        }),
      }))

    return res.render('pages/person/home', {
      recalls,
      prisoner,
      nomsId,
      serviceDefinitions,
    })
  }
}
