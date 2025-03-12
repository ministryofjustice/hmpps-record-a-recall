import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { CreateRecall } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { createAnswerSummaryList } from '../../utils/utils'
import getJourneyDataFromRequest, {
  getUalToSave,
  RecallJourneyData,
  getExistingAdjustments,
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
        revocationDate: journeyData.recallDateString,
        returnToCustodyDate: journeyData.returnToCustodyDateString,
        recallTypeCode: journeyData.recallType.code,
        createdByUsername: username,
        createdByPrison: activeCaseload.id,
        sentenceIds: journeyData.sentenceIds,
      }

      const createResponse = await req.services.recallService.postRecall(recallToSave, username)

      const existingUal = await req.services.adjustmentsService.searchUal(nomisId, username)

      // in req fields there should only be one passing from saveValues in RTCDcontroller?
      const existingAdjustments: AdjustmentDto[] = getExistingAdjustments(req)
      // set recallID on one to post if we have both post and update

      const ualToSave = getUalToSave(req)
      if (ualToSave !== null) {
        ualToSave.recallId = createResponse.recallUuid
        await req.services.adjustmentsService.updateUal(ualToSave, username, existingAdjustments[0].id).catch(() => {
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
