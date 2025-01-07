import { Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import PrisonerDetailsController from '../base/prisonerDetailsController'
import config from '../../config'

export default class RecallBaseController extends PrisonerDetailsController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const calculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    const recallDate = req.sessionModel.get('recallDate')
    const validationErrors = req.sessionModel.get('validationErrors')

    const urls = {
      recalls: `${config.applications.recordARecall.url}/person/${locals.nomisId}`,
      crds: `${config.applications.calculateReleaseDates.url}/person/${locals.nomisId}`,
      adjustments: `${config.applications.adjustments.url}/${locals.nomisId}`,
      profile: `${config.applications.digitalPrisonServices.url}/prisoner/${locals.nomisId}`,
      ccards: `${config.applications.courtCasesReleaseDates.url}/prisoner/${locals.nomisId}/overview`,
    }

    return { ...locals, calculation, recallDate, urls, validationErrors }
  }
}
