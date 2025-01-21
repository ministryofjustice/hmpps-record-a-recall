import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import { format } from 'date-fns'
import RecallBaseController from '../recallBaseController'

import logger from '../../../../logger'
import { calculateUal } from '../../../utils/utils'

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
    const { storedRecall, recallId } = res.locals
    const { recallType } = storedRecall
    const recallDate = format(new Date(storedRecall.recallDate), 'yyyy-MM-dd')
    const returnToCustodyDate = format(new Date(storedRecall.returnToCustodyDate), 'yyyy-MM-dd')
    storedRecall.ual = calculateUal(recallDate, returnToCustodyDate)
    req.sessionModel.set('storedRecall', storedRecall)
    req.sessionModel.set('recallId', recallId)
    req.sessionModel.set('isEdit', true)
    req.sessionModel.set('recallDate', recallDate)
    req.sessionModel.set('recallType', recallType.code)
    req.sessionModel.set('returnToCustodyDate', returnToCustodyDate)
    req.sessionModel.set('inPrisonAtRecall', this.getBooleanAsFormValue(!storedRecall.returnToCustodyDate))
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
