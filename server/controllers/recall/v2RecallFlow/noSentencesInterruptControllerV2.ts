import { Request, Response } from 'express'
import BaseController from '../../base/BaseController'

export default class NoSentencesInterruptControllerV2 extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const sessionData = NoSentencesInterruptControllerV2.getSessionData(req)
    const { nomisId, recallId } = res.locals

    const prisoner = res.locals.prisoner || sessionData?.prisoner

    const isEditMode = req.originalUrl.includes('/edit-recall/')

    const journeyBaseLink = isEditMode
      ? `/person/${nomisId}/edit-recall/${recallId}`
      : `/person/${nomisId}/record-recall`
    const backLink = `${journeyBaseLink}/rtc-date`
    const cancelLink = `${journeyBaseLink}/confirm-cancel`

    const revocationDate = sessionData?.revocationDate

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
