import { Request, Response } from 'express'
import { Controller } from '../controller'
import { Page } from '../../services/auditService'
import CourtCasesReleaseDatesService from '../../services/courtCasesReleaseDatesService'

export default class HomeController implements Controller {
  constructor(private readonly courtCasesReleaseDatesService: CourtCasesReleaseDatesService) {}

  public PAGE_NAME = Page.HOME

  GET = async (req: Request<{ nomsId: string }>, res: Response): Promise<void> => {
    const { nomsId } = req.params
    const { prisoner, user } = res.locals
    const serviceDefinitions = await this.courtCasesReleaseDatesService.getServiceDefinitions(nomsId, user.token)
    return res.render('pages/person/home', {
      prisoner,
      nomsId,
      serviceDefinitions,
    })
  }
}
