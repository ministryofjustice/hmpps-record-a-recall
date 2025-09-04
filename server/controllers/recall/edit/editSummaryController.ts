import { NextFunction, Response } from 'express'
import { ExtendedRequest } from '../../base/ExpressBaseController'
import logger from '../../../../logger'

import RecallBaseController from '../recallBaseController'
import { createAnswerSummaryList, calculateUal } from '../../../utils/utils'
import getJourneyDataFromRequest, {
  RecallJourneyData,
  sessionModelFields,
  getPrisoner,
} from '../../../helpers/formWizardHelper'
import { setSessionValue } from '../../../helpers/sessionHelper'
import { CreateRecall } from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class EditSummaryController extends RecallBaseController {
  locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const { recallId, nomisId } = res.locals
    setSessionValue(req, sessionModelFields.IS_EDIT, true)
    const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)
    const editLink = (step: string) => `/person/${nomisId}/edit-recall/${recallId}/${step}/edit`
    const answerSummaryList = createAnswerSummaryList(journeyData, editLink)

    return {
      ...super.locals(req, res),
      answerSummaryList,
      ualText: journeyData.ualText,
      ualDiff: journeyData.ual && journeyData.storedRecall.ual.days !== journeyData.ual,
      storedRecall: journeyData.storedRecall,
    }
  }

  async saveValues(req: ExtendedRequest, res: Response, next: NextFunction) {
    try {
      const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)
      const { nomisId, recallId } = res.locals
      const { username, activeCaseload } = res.locals.user

      // Calculate the new UAL with current form data first
      const newUal = calculateUal(journeyData.revDateString, journeyData.returnToCustodyDateString)

      // Handle UAL adjustments before updating the recall to ensure data consistency
      if (newUal) {
        // Find existing UAL adjustments for this recall
        const existingAdjustments = await req.services.adjustmentsService.searchUal(nomisId, username, recallId)
        const ualAdjustments = existingAdjustments.filter(
          (adj: { adjustmentType: string; unlawfullyAtLarge?: { type?: string } }) =>
            adj.adjustmentType === 'UNLAWFULLY_AT_LARGE' && adj.unlawfullyAtLarge?.type === 'RECALL',
        )

        const prisonerDetails = getPrisoner(req)

        if (ualAdjustments.length) {
          // Handle unexpected multiple UAL adjustments, should only be one per recall
          if (ualAdjustments.length > 1) {
            logger.warn(
              `Found ${ualAdjustments.length} UAL adjustments for recall ${recallId}. Expected only one. Cleaning up duplicates.`,
            )

            // Delete the duplicate UAL adjustments (keep the first one)
            const duplicateAdjustments = ualAdjustments.slice(1)
            await Promise.all(
              duplicateAdjustments.map(async (duplicateUal) => {
                if (duplicateUal.id) {
                  await req.services.adjustmentsService.deleteAdjustment(duplicateUal.id, username)
                  logger.info(`Deleted duplicate UAL adjustment ${duplicateUal.id} for recall ${recallId}`)
                }
              }),
            )
          }

          // Update existing UAL adjustment with fresh dates
          const existingUal = ualAdjustments[0]

          const ualToUpdate = {
            ...newUal,
            nomisId,
            bookingId: prisonerDetails.bookingId,
            recallId,
            adjustmentId: existingUal.id,
          }

          await req.services.adjustmentsService.updateUal(ualToUpdate, username, existingUal.id)
          logger.info(
            `Updated existing UAL adjustment ${existingUal.id} for recall ${recallId} with dates: ${newUal.firstDay} to ${newUal.lastDay}`,
          )
        } else {
          // No existing UAL found, create a new one
          const ualToCreate = {
            ...newUal,
            nomisId,
            bookingId: prisonerDetails.bookingId,
            recallId,
          }

          await req.services.adjustmentsService.postUal(ualToCreate, username)
          logger.info(
            `Created new UAL adjustment for recall ${recallId} with dates: ${newUal.firstDay} to ${newUal.lastDay}`,
          )
        }
      } else {
        logger.info(
          `No UAL period needed for recall ${recallId} - revocation date and return to custody date are too close`,
        )
      }

      // Update the recall only after UAL adjustments succeed
      const recallToSave: CreateRecall = {
        prisonerId: nomisId,
        revocationDate: journeyData.revDateString,
        returnToCustodyDate: journeyData.returnToCustodyDateString,
        recallTypeCode: journeyData.recallType.code,
        createdByUsername: username,
        createdByPrison: activeCaseload.id,
        sentenceIds: journeyData.sentenceIds || journeyData.storedRecall.sentenceIds,
      }
      await req.services.recallService.updateRecall(recallId, recallToSave, username)

      return next()
    } catch (error) {
      return next(error)
    }
  }

  successHandler(req: ExtendedRequest, res: Response, next: NextFunction) {
    req.flash('action', `updated`)
    setSessionValue(req, sessionModelFields.JOURNEY_COMPLETE, true)
    return super.successHandler(req, res, next)
  }
}
