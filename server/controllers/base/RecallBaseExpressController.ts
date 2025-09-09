import { NextFunction, Response } from 'express'
import { Session } from 'express-session'
import PrisonerDetailsExpressController from './PrisonerDetailsExpressController'
import { ExtendedRequest } from './ExpressBaseController'
import getServiceUrls from '../../helpers/urlHelper'
import getJourneyDataFromRequest, { getTemporaryCalc, sessionModelFields } from '../../helpers/recallSessionHelper'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'

export default class RecallBaseExpressController extends PrisonerDetailsExpressController {
  protected middlewareSetup() {
    super.middlewareSetup()
  }

  protected checkJourneyProgress(req: ExtendedRequest, res: Response, next: NextFunction) {
    const isEdit = req.session?.formData?.[sessionModelFields.IS_EDIT]
    const journeyComplete = req.session?.formData?.[sessionModelFields.JOURNEY_COMPLETE] as boolean

    if (!isEdit || journeyComplete) {
      super.checkJourneyProgress(req, res, next)
    } else {
      // Skips journey validation if we're editing and haven't hit the recall updated screen
      next()
    }
  }

  public locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)

    // Create a mock sessionModel for getJourneyDataFromRequest compatibility
    const mockSessionModel = {
      get: (key: string) => req.session?.formData?.[key],
      set: () => {},
      unset: () => {},
      toJSON: () => req.session?.formData || {},
      reset: () => {},
      save: () => {},
    }
    const mockReq = { ...req, sessionModel: mockSessionModel } as ExtendedRequest & {
      sessionModel: typeof mockSessionModel
    }

    const journeyData = getJourneyDataFromRequest(mockReq)
    const isEditRecall = journeyData.isEdit
    const recallId = journeyData.storedRecall?.recallId
    const calculation = getTemporaryCalc(mockReq)
    const { revocationDate } = journeyData

    const crdsValidationErrors = req.session?.formData?.[sessionModelFields.CRDS_ERRORS]
    const autoRecallFailErrors = req.session?.formData?.[sessionModelFields.HAPPY_PATH_FAIL_REASONS]
    const selectedRecallType = journeyData.recallType
    const relevantAdjustments: AdjustmentDto[] =
      (req.session?.formData?.[sessionModelFields.RELEVANT_ADJUSTMENTS] as AdjustmentDto[]) || []
    const arrestDate: Date = journeyData.returnToCustodyDate

    const hasMultipleOverlappingUALTypeRecall: boolean =
      (req.session?.formData?.[sessionModelFields.HAS_MULTIPLE_OVERLAPPING_UAL_TYPE_RECALL] as boolean) || false

    const urls = getServiceUrls(res.locals.nomisId)
    const journeyBaseLink = `/person/${locals.nomisId}/${isEditRecall ? `edit-recall/${recallId}` : 'record-recall'}`
    const cancelLink = `${journeyBaseLink}/confirm-cancel`

    // Handle back link logic
    const lastVisited = (req.session as Session & { lastVisited?: string })?.lastVisited
    if (lastVisited?.includes('check-your-answers') || lastVisited?.includes('edit-summary')) {
      res.locals.backLink = lastVisited
    } else if (!res.locals.backLink) {
      res.locals.backLink = lastVisited || journeyBaseLink
    }

    const action = req.flash ? req.flash('action') : []

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
