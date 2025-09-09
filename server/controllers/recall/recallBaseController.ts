import { NextFunction, Response } from 'express'
import { Session } from 'express-session'
import PrisonerDetailsController from '../base/prisonerDetailsController'
import { ExtendedRequest } from '../base/ExpressBaseController'
import getServiceUrls from '../../helpers/urlHelper'
import getJourneyDataFromRequest, { getTemporaryCalc, sessionModelFields } from '../../helpers/recallSessionHelper'
import { getSessionValue } from '../../helpers/sessionHelper'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'

export default class RecallBaseController extends PrisonerDetailsController {
  middlewareSetup() {
    super.middlewareSetup()
  }

  // Re-export formError for compatibility - needs to match parent signature
  protected formError(fieldName: string, type: string): { key: string; type: string } {
    return {
      key: fieldName,
      type,
    }
  }

  checkJourneyProgress(req: ExtendedRequest, res: Response, next: NextFunction) {
    const isEdit = getSessionValue(req, sessionModelFields.IS_EDIT)
    const journeyComplete = getSessionValue(req, sessionModelFields.JOURNEY_COMPLETE)

    if (!isEdit || journeyComplete) {
      super.checkJourneyProgress(req as ExtendedRequest, res, next)
    } else {
      // Skips journey validation if we're editing and haven't hit the recall updated screen
      // TODO There should be a nicer way of doing this, preemptively setting steps as complete
      next()
    }
  }

  locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const locals = super.locals(req as ExtendedRequest, res)
    const mockSessionModel = {
      get: (key: string) => getSessionValue(req, key),
      set: () => {},
      unset: () => {},
      toJSON: () => req.session?.formData || {},
      reset: () => {},
      save: () => {},
    }
    const mockReq = { ...req, sessionModel: mockSessionModel } as unknown as Parameters<
      typeof getJourneyDataFromRequest
    >[0]

    const journeyData = getJourneyDataFromRequest(mockReq)
    const isEditRecall = journeyData.isEdit
    const recallId = journeyData.storedRecall?.recallId
    const calculation = getTemporaryCalc(mockReq)
    const { revocationDate } = journeyData
    const crdsValidationErrors = mockSessionModel.get(sessionModelFields.CRDS_ERRORS)
    const autoRecallFailErrors = mockSessionModel.get(sessionModelFields.HAPPY_PATH_FAIL_REASONS)
    const selectedRecallType = journeyData.recallType
    const relevantAdjustments: AdjustmentDto[] = (mockSessionModel.get(sessionModelFields.RELEVANT_ADJUSTMENTS) ||
      []) as AdjustmentDto[]
    const arrestDate: Date = journeyData.returnToCustodyDate

    const hasMultipleOverlappingUALTypeRecall: boolean =
      (mockSessionModel.get(sessionModelFields.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL) as boolean) || false

    const urls = getServiceUrls(res.locals.nomisId)
    const journeyBaseLink = `/person/${locals.nomisId}/${isEditRecall ? `edit-recall/${recallId}` : 'record-recall'}`
    const cancelLink = `${journeyBaseLink}/confirm-cancel`

    const lv =
      (req as Express.Request & { journeyModel?: { attributes?: { lastVisited?: string } } }).journeyModel?.attributes
        ?.lastVisited || (req.session as Session & { lastVisited?: string })?.lastVisited
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
