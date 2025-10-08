import { Request, Response } from 'express'
import BaseController from '../../base/BaseController'

export default class ConflictingAdjustmentsInterruptControllerV2 extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = ConflictingAdjustmentsInterruptControllerV2.getSessionData(req)
    const { nomisId, recallId } = res.locals

    // Get prisoner data from session or res.locals
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Get data needed by template from session
    const revocationDate = sessionData?.revocationDate
    const arrestDate = sessionData?.returnToCustodyDate // Template calls it arrestDate
    const relevantAdjustments = sessionData?.relevantAdjustment || [] // Note: session key is singular
    const hasMultipleOverlappingUALTypeRecall = sessionData?.hasMultipleOverlappingUalTypeRecall || false

    // Determine if this is an edit recall flow
    const isEditMode = req.originalUrl.includes('/edit-recall-v2/')

    // Build navigation URLs for V2
    const journeyBaseLink = isEditMode
      ? `/person/${nomisId}/edit-recall-v2/${recallId}`
      : `/person/${nomisId}/record-recall-v2`
    const backLink = `${journeyBaseLink}/rtc-date`
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
