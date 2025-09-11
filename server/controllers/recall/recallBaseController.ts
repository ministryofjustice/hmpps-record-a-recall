import { NextFunction, Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import PrisonerDetailsController from '../base/prisonerDetailsController'
import getServiceUrls from '../../helpers/urlHelper'
import getJourneyDataFromRequest, { getTemporaryCalc } from '../../helpers/formWizardHelper'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'
import { SessionManager } from '../../services/sessionManager'

export default class RecallBaseController extends PrisonerDetailsController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  checkJourneyProgress(req: FormWizard.Request, res: Response, next: NextFunction) {
    if (
      !SessionManager.getSessionValue(req, SessionManager.SESSION_KEYS.IS_EDIT) ||
      SessionManager.getSessionValue<boolean>(req, SessionManager.SESSION_KEYS.JOURNEY_COMPLETE)
    ) {
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
    const calculation = getTemporaryCalc(req)
    const { revocationDate } = journeyData
    const crdsValidationErrors = SessionManager.getSessionValue(req, SessionManager.SESSION_KEYS.CRDS_ERRORS)
    const autoRecallFailErrors = SessionManager.getSessionValue(
      req,
      SessionManager.SESSION_KEYS.HAPPY_PATH_FAIL_REASONS,
    )
    const selectedRecallType = journeyData.recallType
    const relevantAdjustments: AdjustmentDto[] =
      SessionManager.getSessionValue(req, SessionManager.SESSION_KEYS.RELEVANT_ADJUSTMENTS) || []
    const arrestDate: Date = journeyData.returnToCustodyDate

    const hasMultipleOverlappingUALTypeRecall: boolean =
      SessionManager.getSessionValue(req, SessionManager.SESSION_KEYS.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL) || false

    const urls = getServiceUrls(res.locals.nomisId)
    const journeyBaseLink = `/person/${locals.nomisId}/${isEditRecall ? `edit-recall/${recallId}` : 'record-recall'}`
    const cancelLink = `${journeyBaseLink}/confirm-cancel`

    const lv = req.journeyModel.attributes.lastVisited
    if (lv?.includes('check-your-answers') || lv?.includes('edit-summary')) {
      res.locals.backLink = lv
    } else if (!res.locals.backLink) {
      res.locals.backLink = lv || journeyBaseLink
    }

    const action = req.flash('action')

    return {
      ...locals,
      calculation,
      revocationDate,
      urls,
      crdsValidationErrors,
      autoRecallFailErrors,
      journeyBaseLink,
      cancelLink,
      isEditRecall,
      action,
      selectedRecallType,
      relevantAdjustments,
      arrestDate,
      hasMultipleOverlappingUALTypeRecall,
    }
  }
}
