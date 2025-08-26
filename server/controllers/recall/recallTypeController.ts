import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { RecallTypes } from '../../@types/recallTypes'
import { getInvalidRecallTypes, getRecallTypeCode, sessionModelFields } from '../../helpers/formWizardHelper'
import config from '../../config'

export default class RecallTypeController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const { prisoner } = res.locals
    const backLink = `/person/${prisoner.prisonerNumber}${locals.isEditRecall ? `/recall/${locals.recallId}/edit/edit-summary` : '/record-recall/check-sentences'}`
    return { ...locals, backLink }
  }

  configure(req: FormWizard.Request, res: Response, next: NextFunction) {
    const recallTypes = Object.values(RecallTypes)
    req.form.options.fields.recallType.items = Object.values(recallTypes).map(({ code, description }) => ({
      text: description,
      value: code,
    }))

    next()
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    let recallTypeMismatch = false
    if (config.featureToggles.unexpectedRecallTypeCheckEnabled) {
      const selectedType = getRecallTypeCode(req)
      const invalidRecallTypes = getInvalidRecallTypes(req)
      // @ts-expect-error Type will be correct
      recallTypeMismatch = invalidRecallTypes?.map(t => t.code).includes(selectedType) || false
    }
    req.sessionModel.set(sessionModelFields.RECALL_TYPE_MISMATCH, recallTypeMismatch)
    return super.successHandler(req, res, next)
  }
}
