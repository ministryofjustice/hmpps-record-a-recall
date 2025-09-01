import { NextFunction, Response } from 'express'
import RecallBaseController from './recallBaseController'
import { ExtendedRequest } from '../base/ExpressBaseController'
import { RecallTypes } from '../../@types/recallTypes'
import { getInvalidRecallTypes, getRecallTypeCode, sessionModelFields } from '../../helpers/formWizardHelper'
import { setSessionValue } from '../../helpers/sessionHelper'
import config from '../../config'

export default class RecallTypeController extends RecallBaseController {
  locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const { prisoner } = res.locals
    const backLink = `/person/${prisoner.prisonerNumber}${locals.isEditRecall ? `/recall/${locals.recallId}/edit/edit-summary` : '/record-recall/check-sentences'}`
    return { ...locals, backLink }
  }

  configure(req: ExtendedRequest, res: Response, next: NextFunction) {
    const recallTypes = Object.values(RecallTypes)
    if (req.form?.options?.fields?.recallType) {
      req.form.options.fields.recallType.items = Object.values(recallTypes).map(({ code, description }) => ({
        text: description,
        value: code,
      }))
    }
    next()
  }

  successHandler(req: ExtendedRequest, res: Response, next: NextFunction) {
    let recallTypeMismatch = false
    if (config.featureToggles.unexpectedRecallTypeCheckEnabled) {
      const selectedType = getRecallTypeCode(req as any)
      const invalidRecallTypes = getInvalidRecallTypes(req as any)
      // @ts-expect-error Type will be correct
      recallTypeMismatch = invalidRecallTypes?.map(t => t.code).includes(selectedType) || false
    }
    setSessionValue(req, sessionModelFields.RECALL_TYPE_MISMATCH, recallTypeMismatch)
    return super.successHandler(req, res, next)
  }
}
