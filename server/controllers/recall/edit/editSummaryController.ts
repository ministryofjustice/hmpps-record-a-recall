import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import logger from '../../../../logger'

import RecallBaseController from '../recallBaseController'
import { createAnswerSummaryList, calculateUal } from '../../../utils/utils'
import getJourneyDataFromRequest, {
  RecallJourneyData,
  sessionModelFields,
  getPrisoner,
} from '../../../helpers/formWizardHelper'
import { CreateRecall } from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class EditSummaryController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const { recallId, nomisId } = res.locals
    req.sessionModel.set(sessionModelFields.IS_EDIT, true)
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

  async saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    try {
      const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)
      const { nomisId, recallId } = res.locals
      const { username, activeCaseload } = res.locals.user

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

      // Calculate the new UAL with current form data
      const newUal = calculateUal(journeyData.revDateString, journeyData.returnToCustodyDateString)

      if (newUal) {
        try {
          // Find existing UAL adjustments for this recall
          const existingAdjustments = await req.services.adjustmentsService.searchUal(nomisId, username, recallId)
          const ualAdjustments = existingAdjustments.filter(
            adj => adj.adjustmentType === 'UNLAWFULLY_AT_LARGE' && adj.unlawfullyAtLarge?.type === 'RECALL',
          )

          if (ualAdjustments.length > 0) {
            // Update existing UAL adjustment with fresh dates
            const existingUal = ualAdjustments[0]
            const prisonerDetails = getPrisoner(req)

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
            const prisonerDetails = getPrisoner(req)
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
        } catch (error) {
          logger.error(`Error handling UAL adjustments for recall ${recallId}: ${error.message}`, error)
        }
      } else {
        logger.info(
          `No UAL period needed for recall ${recallId} - revocation date and return to custody date are too close`,
        )
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    req.flash('action', `updated`)
    req.sessionModel.set(sessionModelFields.JOURNEY_COMPLETE, true)
    return super.successHandler(req, res, next)
  }
}
