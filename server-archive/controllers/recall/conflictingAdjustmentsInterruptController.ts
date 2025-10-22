import { Request, Response } from 'express'
import BaseController from '../base/BaseController'

export default class ConflictingAdjustmentsInterruptController extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = ConflictingAdjustmentsInterruptController.getSessionData(req)
    const { nomisId, recallId } = res.locals

    const prisoner = res.locals.prisoner || sessionData?.prisoner

    const revocationDate = sessionData?.revocationDate
    const arrestDate = sessionData?.returnToCustodyDate // Template calls it arrestDate
    const relevantAdjustments = sessionData?.relevantAdjustment || []
    const hasMultipleOverlappingUALTypeRecall = sessionData?.hasMultipleOverlappingUalTypeRecall || false

    const isEditMode = req.originalUrl.includes('/edit-recall/')

    const journeyBaseLink = isEditMode
      ? `/person/${nomisId}/edit-recall/${recallId}`
      : `/person/${nomisId}/record-recall`
    const backLink = `${journeyBaseLink}/revocation-date`
    const cancelLink = `${journeyBaseLink}/confirm-cancel`

    // Render the existing template with V2 navigation
    res.render('pages/recall/conflicting-adjustments-interrupt', {
      prisoner,
      nomisId,
      revocationDate,
      arrestDate,
      relevantAdjustments,
      hasMultipleOverlappingUALTypeRecall,
      journeyBaseLink,
      backLink,
      cancelLink,
    })
  }
  // No POST handler needed - this is display only
}
