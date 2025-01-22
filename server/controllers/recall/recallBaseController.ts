import { Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import PrisonerDetailsController from '../base/prisonerDetailsController'
import getServiceUrls from '../../helpers/urlHelper'
import getJourneyDataFromRequest from '../../helpers/formWizardHelper'

export default class RecallBaseController extends PrisonerDetailsController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const journeyData = getJourneyDataFromRequest(req)
    const isEditRecall = journeyData.isEdit
    const recallId = journeyData.storedRecall?.recallId
    const calculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    const { recallDate } = journeyData
    const crdsValidationErrors = req.sessionModel.get('crdsValidationErrors')
    const autoRecallFailErrors = req.sessionModel.get('autoRecallFailErrors')

    const urls = getServiceUrls(res.locals.nomisId)
    const cancelLink = `/person/${locals.nomisId}/recall${isEditRecall ? `/${recallId}/edit` : ''}/confirm-cancel`

    const action = req.flash('action')

    return {
      ...locals,
      calculation,
      recallDate,
      urls,
      crdsValidationErrors,
      autoRecallFailErrors,
      cancelLink,
      isEditRecall,
      action,
    }
  }
}
