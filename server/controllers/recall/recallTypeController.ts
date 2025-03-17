import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { RecallTypes } from '../../@types/recallTypes'
import { getRecallTypeCode, sessionModelFields, getInvalidRecallTypes } from '../../helpers/formWizardHelper'

export default class RecallTypeController extends RecallBaseController {
  configure(req: FormWizard.Request, res: Response, next: NextFunction) {
    const recallTypes = Object.values(RecallTypes)
    req.form.options.fields.recallType.items = Object.values(recallTypes).map(({ code, description }) => ({
      text: description,
      value: code,
    }))

    next()
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    const selectedType = getRecallTypeCode(req)
    const invalidRecallTypes = getInvalidRecallTypes(req)

    req.sessionModel.set(
      sessionModelFields.RECALL_TYPE_MISMATCH,
      // @ts-expect-error Type will be correct
      invalidRecallTypes?.map(t => t.code).includes(selectedType) || false,
    )
    return super.successHandler(req, res, next)
  }
}
