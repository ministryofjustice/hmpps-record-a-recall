import { Request, Response } from 'express'
import { Controller } from '../../controller'
import { PersonJourneyParams } from '../../../@types/journeys'
import { buildReturnUrlFromKey } from '../createRecallUrls'
import { Page } from '../../../services/auditService'
import { ConfirmCancelForm } from '../../common/confirm-cancel/confirmCancelSchema'
import GlobalRecallUrls from '../../globalRecallUrls'

export default class CreateRecallCancelController implements Controller {
  constructor() {}

  PAGE_NAME: Page = Page.CREATE_RECALL_CANCEL

  GET = async (req: Request<PersonJourneyParams>, res: Response): Promise<void> => {
    const { prisoner } = res.locals
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const { returnKey, caseIndex } = req.query as { returnKey: string; caseIndex?: string }

    const extraParams = { caseIndex: caseIndex !== undefined ? Number(caseIndex) : undefined }
    const returnUrl = buildReturnUrlFromKey(returnKey, nomsId, journeyId, createOrEdit, recallId, extraParams)

    return res.render('pages/recall/confirm-cancel', {
      prisoner,
      backLink: returnUrl,
    })
  }

  POST = async (req: Request<PersonJourneyParams, unknown, ConfirmCancelForm>, res: Response): Promise<void> => {
    const { nomsId, journeyId, createOrEdit, recallId } = req.params
    const { confirmCancel } = req.body
    if (confirmCancel === 'YES') {
      delete req.session.recallJourneys[journeyId]
      return res.redirect(GlobalRecallUrls.home(nomsId))
    }

    const { returnKey, caseIndex } = req.query as { returnKey: string; caseIndex?: string }
    const extraParams = { caseIndex: caseIndex !== undefined ? Number(caseIndex) : undefined }
    const returnUrl = buildReturnUrlFromKey(returnKey, nomsId, journeyId, createOrEdit, recallId, extraParams)
    return res.redirect(returnUrl)
  }
}
