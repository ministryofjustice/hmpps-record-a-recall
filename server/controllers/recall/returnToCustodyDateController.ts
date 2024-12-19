import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import { isBefore } from 'date-fns'

import RecallBaseController from './recallBaseController'
import { calculateUal } from '../../utils/utils'

export default class ReturnToCustodyDateController extends RecallBaseController {
  validateFields(req: FormWizard.Request, res: Response, callback: (errors: unknown) => void) {
    super.validateFields(req, res, errors => {
      const { values } = req.form
      const recallDate = req.sessionModel.get<string>('recallDate')

      /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
      const validationErrors: any = {}

      if (values.inPrisonAtRecall === 'false' && isBefore(values.returnToCustodyDate as string, recallDate)) {
        validationErrors.returnToCustodyDate = this.formError('returnToCustodyDate', 'mustBeEqualOrAfterRecallDate')
      }

      callback({ ...errors, ...validationErrors })
    })
  }

  saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { values } = req.form

    if (values.inPrisonAtRecall === 'false') {
      const recallDate = req.sessionModel.get<string>('recallDate')

      const rtcDate = values.returnToCustodyDate as string

      const ual = calculateUal(recallDate, rtcDate)
      req.sessionModel.set('ual', ual)
    } else {
      req.sessionModel.unset('ual')
      values.returnToCustodyDate = null
    }

    return super.saveValues(req, res, next)
  }
}
