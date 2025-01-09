import { Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import PrisonerDetailsController from '../base/prisonerDetailsController'
import getServiceUrls from '../../helpers/urlHelper'

export default class RecallBaseController extends PrisonerDetailsController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const calculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    const recallDate = req.sessionModel.get('recallDate')
    const validationErrors = req.sessionModel.get('crdsValidationErrors')
    const autoRecallFailErrors = req.sessionModel.get('autoRecallFailErrors')

    const urls = getServiceUrls(res.locals.nomisId)

    return { ...locals, calculation, recallDate, urls, validationErrors, autoRecallFailErrors }
  }
}
