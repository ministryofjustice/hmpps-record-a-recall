import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { Page } from '../../../services/auditService'
import config from '../../../config'

export default class CreateRecallConfirmationController implements Controller {
  PAGE_NAME: Page = Page.CREATE_RECALL_CONFIRMATION

  GET = async (req: Request<{ nomsId: string; recallId: string }>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId } = req.params
    const urls = {
      adjustments: `${config.urls.adjustments}/${nomsId}`,
      crds: `${config.urls.crds}?prisonId=${nomsId}`,
      ccrd: `${config.urls.courtCasesReleaseDates}/prisoner/${nomsId}/overview`,
    }

    return res.render('pages/recall/recall-confirmation', {
      prisoner,
      pageCaption: 'Record a recall',
      urls,
    })
  }
}
