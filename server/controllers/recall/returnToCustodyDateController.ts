import FormWizard from 'hmpo-form-wizard'
import { Response } from 'express'

import RecallBaseController from './recallBaseController'

export default class ReturnToCustodyDateController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    return super.locals(req, res)
  }

  validateFields(req: FormWizard.Request, res: Response, callback: (errors: unknown) => void) {
    super.validateFields(req, res, errors => {
      const { values } = req.form
      const recallDate = req.sessionModel.get('recallDate')

      /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
      const validationErrors: any = {}

      if (values.returnToCustodyDate < recallDate) {
        validationErrors.returnToCustodyDate = this.formError('returnToCustodyDate', 'mustBeEqualOrAfterRecallDate')
      }

      callback({ ...errors, ...validationErrors })
    })
  }
}
