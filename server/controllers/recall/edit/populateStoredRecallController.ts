import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { format } from 'date-fns'
import RecallBaseController from '../recallBaseController'

import logger from '../../../../logger'
import { calculateUal } from '../../../utils/utils'
import { sessionModelFields } from '../../../helpers/formWizardHelper'

export default class PopulateStoredRecallController extends RecallBaseController {
  async configure(req: FormWizard.Request, res: Response, next: NextFunction): Promise<void> {
    const { username, recallId } = res.locals
    try {
      await req.services.recallService
        .getRecall(recallId, username)
        .then(async storedRecall => {
          res.locals.storedRecall = storedRecall
        })
        .catch(error => {
          logger.error(error.userMessage)
        })
    } catch (error) {
      logger.error(error)
    }
    return super.configure(req, res, next)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    req.sessionModel.set(sessionModelFields.ENTRYPOINT, res.locals.entrypoint)
    const { storedRecall, recallId } = res.locals
    const { recallType } = storedRecall
    const recallDate = format(new Date(storedRecall.recallDate), 'yyyy-MM-dd')
    const returnToCustodyDate = storedRecall.returnToCustodyDate
      ? format(new Date(storedRecall.returnToCustodyDate), 'yyyy-MM-dd')
      : null
    storedRecall.ual = calculateUal(recallDate, returnToCustodyDate)
    req.sessionModel.set(sessionModelFields.STORED_RECALL, storedRecall)
    req.sessionModel.set(sessionModelFields.RECALL_ID, recallId)
    req.sessionModel.set(sessionModelFields.IS_EDIT, true)
    req.sessionModel.set(sessionModelFields.RECALL_DATE, recallDate)
    req.sessionModel.set(sessionModelFields.RECALL_TYPE, recallType.code)
    req.sessionModel.set(sessionModelFields.RTC_DATE, returnToCustodyDate)
    req.sessionModel.set(
      sessionModelFields.IN_PRISON_AT_RECALL,
      this.getBooleanAsFormValue(!storedRecall.returnToCustodyDate),
    )
    return {
      ...super.locals(req, res),
      isEdit: true,
    }
  }

  getBooleanAsFormValue(storedValue: boolean): string {
    if (storedValue === true) {
      return 'true'
    }
    if (storedValue === false) {
      return 'false'
    }
    return null
  }
}
