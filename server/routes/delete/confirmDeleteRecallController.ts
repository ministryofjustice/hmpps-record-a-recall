import { Request, Response } from 'express'
import GlobalRecallUrls from '../globalRecallUrls'
import { Controller } from '../controller'
import RecallService from '../../services/recallService'
import { Page } from '../../services/auditService'
import { ConfirmDeleteRecallForm } from './confirmDeleteRecallSchema'

export default class ConfirmDeleteRecallController implements Controller {
  constructor(private readonly recallService: RecallService) {}

  PAGE_NAME: Page = Page.CONFIRM_DELETE_RECALL

  GET = async (req: Request<{ nomsId: string; recallUuid: string }>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, recallUuid } = req.params
    const { username } = res.locals.user
    const backLink = GlobalRecallUrls.home(nomsId)
    const recall = await this.recallService.getRecall(recallUuid, username)

    return res.render('pages/recall/delete-confirmation', {
      prisoner,
      recall,
      backLink,
    })
  }

  POST = async (
    req: Request<
      {
        nomsId: string
        recallUuid: string
      },
      unknown,
      ConfirmDeleteRecallForm
    >,
    res: Response,
  ): Promise<void> => {
    const { nomsId, recallUuid } = req.params
    const { username } = res.locals.user
    const { confirmDeleteRecall } = req.body
    if (confirmDeleteRecall === 'YES') {
      await this.recallService.deleteRecall(recallUuid, username)
    }
    return res.redirect(GlobalRecallUrls.home(nomsId))
  }
}
