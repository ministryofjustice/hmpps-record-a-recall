import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'
import logger from '../../../../logger'

import RecallBaseController from '../recallBaseController'
import { createAnswerSummaryList } from '../../../utils/utils'
import getJourneyDataFromRequest, {
  RecallJourneyData,
  sessionModelFields,
  getUalToCreate,
  getUalToEdit,
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

      // Handle associated UAL adjustments if dates have changed
      const ualToCreate = getUalToCreate(req)
      const ualToEdit = getUalToEdit(req)

      if (ualToCreate) {
        // For an edited recall we already have the recallId so attach it
        ualToCreate.recallId = recallId
        await req.services.adjustmentsService.postUal(ualToCreate, username).catch(() => {
          logger.error('Error while posting UAL to adjustments API during recall edit')
        })
      }

      if (ualToEdit) {
        // Ensure the UAL links back to the recall only if not creating another one in the same operation
        ualToEdit.recallId = ualToCreate ? null : recallId
        await req.services.adjustmentsService.updateUal(ualToEdit, username, ualToEdit.adjustmentId).catch(() => {
          logger.error('Error while updating UAL in adjustments API during recall edit')
        })
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
