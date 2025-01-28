import { NextFunction, Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import PrisonerDetailsController from '../base/prisonerDetailsController'
import getServiceUrls from '../../helpers/urlHelper'
import getJourneyDataFromRequest from '../../helpers/formWizardHelper'

export default class RecallBaseController extends PrisonerDetailsController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  checkJourneyProgress(req: FormWizard.Request, res: Response, next: NextFunction) {
    if (!req.sessionModel.get('isEdit') || req.sessionModel.get<boolean>('journeyComplete')) {
      super.checkJourneyProgress(req, res, next)
    } else {
      // Skips journey validation if we're editing and haven't hit the recall updated screen
      // TODO There should be a nicer way of doing this, preemptively setting steps as complete
      next()
    }
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
    const cancelLink = `/person/${locals.nomisId}/${isEditRecall ? `edit-recall/${recallId}/` : 'record-recall'}/confirm-cancel`

    const lv = req.journeyModel.attributes.lastVisited
    if (lv?.includes('check-your-answers') || lv?.includes('edit-summary')) {
      res.locals.backLink = lv
    }

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
