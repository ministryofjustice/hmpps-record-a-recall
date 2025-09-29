import { Request, Response } from 'express'
import BaseController from '../../../controllers/base/BaseController'

export default class NoSentencesInterruptControllerV2 extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = NoSentencesInterruptControllerV2.getSessionData(req)
    const { nomisId } = res.locals

    // Get prisoner data from session or res.locals
    const prisoner = res.locals.prisoner || sessionData?.prisoner

    // Build navigation URLs for V2
    const journeyBaseLink = `/person/${nomisId}/record-recall-v2`
    const backLink = `${journeyBaseLink}/rtc-date`
    const cancelLink = `${journeyBaseLink}/confirm-cancel`

    // Get revocation date from session
    const revocationDate = sessionData?.revocationDate

    // Render the existing template with V2 navigation
    res.render('pages/recall/no-sentences-interrupt', {
      prisoner,
      nomisId,
      revocationDate,
      journeyBaseLink,
      backLink,
      cancelLink,
    })
  }
  // No POST handler needed - this is display only
}
