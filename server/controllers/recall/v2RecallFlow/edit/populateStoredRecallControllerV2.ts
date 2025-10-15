import { Request, Response } from 'express'
import { format } from 'date-fns'
import BaseController from '../../../base/BaseController'
import logger from '../../../../../logger'
import { calculateUal } from '../../../../utils/utils'

export default class PopulateStoredRecallControllerV2 extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    const { nomisId, recallId } = res.locals
    const { username } = res.locals.user

    // Check if we already have session data from previous edits
    const sessionData = PopulateStoredRecallControllerV2.getSessionData(req)
    if (sessionData?.isEdit && sessionData?.storedRecall && sessionData?.recallId === recallId) {
      // Already loaded and possibly edited - skip reloading
      logger.info(`Recall ${recallId} already in session, skipping reload`)
      return res.redirect(`/person/${nomisId}/edit-recall/${recallId}/edit-summary`)
    }

    try {
      // Load the stored recall from API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { services } = req as any
      const storedRecall = await services.recallService.getRecall(recallId, username)

      // Load existing UAL adjustments for this recall
      const existingAdjustments = await services.adjustmentsService
        .searchUal(nomisId, username, recallId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .catch((e: Error): any[] => {
          logger.error('Error loading existing adjustments for edit:', e.message)
          return []
        })

      // Format dates for session storage
      const revocationDate = format(new Date(storedRecall.revocationDate), 'yyyy-MM-dd')
      const returnToCustodyDate = storedRecall.returnToCustodyDate
        ? format(new Date(storedRecall.returnToCustodyDate), 'yyyy-MM-dd')
        : null

      // Calculate UAL for the stored recall
      storedRecall.ual = calculateUal(revocationDate, returnToCustodyDate)

      // Populate session with stored recall data using BaseController's updateSessionData
      await PopulateStoredRecallControllerV2.updateSessionData(req, {
        storedRecall,
        recallId,
        isEdit: true,
        revocationDate,
        returnToCustodyDate,
        recallType: storedRecall.recallType.code,
        courtCases: storedRecall.courtCaseIds,
        sentenceIds: storedRecall.sentenceIds,
        existingAdjustments,
        entrypoint: res.locals.entrypoint || 'edit',
        inPrisonAtRecall: !storedRecall.returnToCustodyDate,
        prisoner: res.locals.prisoner,
        // Set journeyComplete to true since we're editing an existing recall
        // The user can immediately save without visiting all steps
        journeyComplete: true,
      })

      logger.info(`Loaded recall ${recallId} for editing`)

      // Redirect to edit-summary
      return res.redirect(`/person/${nomisId}/edit-recall/${recallId}/edit-summary`)
    } catch (error) {
      logger.error('Error loading recall for edit:', error)
      // Redirect to person page on error
      return res.redirect(`/person/${nomisId}`)
    }
  }

  // No POST handler needed - this is a data loading step only
}
