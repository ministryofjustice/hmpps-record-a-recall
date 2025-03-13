import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { CreateRecall } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { createAnswerSummaryList } from '../../utils/utils'
import getJourneyDataFromRequest, {
  getUalToSave,
  RecallJourneyData,
  getExistingAdjustments,
  getUalToEdit,
} from '../../helpers/formWizardHelper'
import logger from '../../../logger'
import { AdjustmentDto } from '../../@types/adjustmentsApi/adjustmentsApiTypes'

export default class CheckYourAnswersController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const { nomisId } = res.locals
    const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)

    const editLink = (step: string) => `/person/${nomisId}/record-recall/${step}/edit`
    const answerSummaryList = createAnswerSummaryList(journeyData, editLink)

    return {
      ...super.locals(req, res),
      answerSummaryList,
      ualText: journeyData.ualText,
    }
  }

  async saveValues(req: FormWizard.Request, res: Response, next: NextFunction) {
    try {
      const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)
      const { nomisId } = res.locals
      const { username, activeCaseload } = res.locals.user

      const recallToSave: CreateRecall = {
        prisonerId: nomisId,
        revocationDate: journeyData.revDateString,
        returnToCustodyDate: journeyData.returnToCustodyDateString,
        recallTypeCode: journeyData.recallType.code,
        createdByUsername: username,
        createdByPrison: activeCaseload.id,
        sentenceIds: journeyData.sentenceIds,
      }

      const createResponse = await req.services.recallService.postRecall(recallToSave, username)

      // We don't need to go and search these again, the existing one we're concerned with will be stored in the session model
      const existingUal = await req.services.adjustmentsService.searchUal(nomisId, username)

      const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
      // set recallID on one to post if we have both post and update

      const ualToEdit = getUalToEdit(req)

      if (ualToEdit !== null) {
        ualToEdit.recallId = createResponse.recallUuid
        await req.services.adjustmentsService.updateUal(ualToEdit, username, existingAdjustments[0].id).catch(() => {
          logger.error('Error while updating UAL in adjustments API')
        })
      }

      const ualToCreate = getUalToSave(req)
      if (ualToCreate !== null) {
        ualToCreate.recallId = createResponse.recallUuid
        await req.services.adjustmentsService.postUal(ualToCreate, username).catch(() => {
          logger.error('Error while posting UAL to adjustments API')
        })
      }
      return next()
    } catch (error) {
      return next(error)
    }
  }

  successHandler(req: FormWizard.Request, res: Response, next: NextFunction) {
    req.flash('action', `recorded`)
    return super.successHandler(req, res, next)
  }
}
