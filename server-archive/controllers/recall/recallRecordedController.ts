import { Request, Response } from 'express'
import BaseController from '../base/BaseController'
import logger from '../../../logger'

export default class RecallRecordedController extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = RecallRecordedController.getSessionData(req)
    const { nomisId } = res.locals

    // Get action from flash message (set by checkYourAnswersControllerV2)
    const action = req.flash('action')[0] || 'recorded'

    // Get prisoner data
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Build URLs for navigation
    const urls = {
      adjustments: `/person/${nomisId}/adjustments`,
      crds: `/person/${nomisId}/calculate-release-dates`,
      profile: `/person/${nomisId}`,
    }

    // Clear session data (reset journey)
    // This mimics the resetJourney: true behavior from FormWizard
    await RecallRecordedController.updateSessionData(req, {
      revocationDate: null,
      returnToCustodyDate: null,
      inPrisonAtRecall: null,
      recallType: null,
      courtCases: null,
      sentenceIds: null,
      journeyComplete: null,
      recallId: null,
      ualToCreate: null,
      ualToEdit: null,
      manualCaseSelection: null,
      selectedCourtCases: null,
      UAL: null,
      ualText: null,
      storedRecall: null,
      entrypoint: null,
    })

    logger.info(`Recall recorded successfully for prisoner ${nomisId}, action: ${action}`)

    res.render('pages/recall/recall-recorded', {
      prisoner,
      nomisId,
      action,
      urls,
    })
  }
}
