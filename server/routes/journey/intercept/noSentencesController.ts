import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { PersonJourneyParams } from '../../../@types/journeys'
import { Page } from '../../../services/auditService'
import GlobalRecallUrls from '../../globalRecallUrls'
import OtherServiceUrls from '../../otherServiceUrls'

export default class NoSentencesController implements Controller {
  PAGE_NAME: Page = Page.NO_SENTENCES_INTERCEPT

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId } = req.params

    return res.render('pages/recall/intercepts/no-sentences', {
      prisoner,
      backLink: GlobalRecallUrls.home(nomsId),
      rasDashboardUrl: OtherServiceUrls.rasDashboard(nomsId),
    })
  }
}
