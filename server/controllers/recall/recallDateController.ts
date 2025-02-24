import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import recallDateCrdsDataComparison from '../../utils/recallDateCrdsDataComparison'
import { getRecallOptions, isManualCaseSelection } from '../../helpers/formWizardHelper'

export default class RecallDateController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner: PrisonerSearchApiPrisoner = locals.prisoner as PrisonerSearchApiPrisoner

    const backLink = `/person/${prisoner.prisonerNumber}${locals.isEditRecall ? `/recall/${locals.recallId}/edit/edit-summary` : ''}`
    return { ...locals, backLink }
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    if (getRecallOptions(req) !== 'MANUAL_ONLY') {
      recallDateCrdsDataComparison(req)
    }
    console.log(isManualCaseSelection(req))
    return super.successHandler(req, res, next)
  }
}
