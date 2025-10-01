import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { CreateRecall } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { createAnswerSummaryList, calculateUal } from '../../utils/utils'
import getJourneyDataFromRequest, {
  getUalToCreate,
  RecallJourneyData,
  getUalToEdit,
} from '../../helpers/formWizardHelper'
import logger from '../../../logger'

export default class CheckYourAnswersController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const { nomisId } = res.locals
    const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)

    const editLink = (step: string) => `/person/${nomisId}/record-recall/${step}/edit`
    const answerSummaryList = createAnswerSummaryList(journeyData, editLink)

    // 🔥 Calculate UAL dynamically if available
    let ualText: string | undefined
    let ualDiff: boolean | undefined
    const calculatedUal = calculateUal(journeyData.revDateString, journeyData.returnToCustodyDateString)

    if (calculatedUal) {
      ualText = `${calculatedUal.days} day${calculatedUal.days === 1 ? '' : 's'}`
      ualDiff = journeyData.storedRecall?.ual?.days !== calculatedUal.days
    }

    console.log('ualText (calculated):', ualText)
    console.log('ualDiff (calculated):', ualDiff)

    return {
      ...super.locals(req, res),
      answerSummaryList,
      ualText,
      ualDiff,
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

      const ualToEdit = getUalToEdit(req) ?? null
      const ualToCreate = getUalToCreate(req) ?? null

      if (ualToCreate !== null) {
        ualToCreate.recallId = createResponse.recallUuid
        await req.services.adjustmentsService.postUal(ualToCreate, username).catch(() => {
          logger.error('Error while posting UAL to adjustments API')
        })
      }

      if (ualToEdit !== null) {
        ualToEdit.recallId = ualToCreate === null ? createResponse.recallUuid : null
        await req.services.adjustmentsService.updateUal(ualToEdit, username, ualToEdit.adjustmentId).catch(() => {
          logger.error('Error while updating UAL in adjustments API')
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
