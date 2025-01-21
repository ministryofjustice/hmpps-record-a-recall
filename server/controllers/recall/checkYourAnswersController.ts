import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import { CreateRecall } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { createAnswerSummaryList } from '../../utils/utils'
import getJourneyDataFromRequest, { RecallJourneyData } from '../../helpers/formWizardHelper'

export default class CheckYourAnswersController extends RecallBaseController {
  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const { nomisId } = res.locals
    const journeyData: RecallJourneyData = getJourneyDataFromRequest(req)

    const editLink = (step: string) => `/person/${nomisId}/recall/${step}/edit`
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
      const { username } = res.locals.user

      const recallToSave: CreateRecall = {
        prisonerId: nomisId,
        recallDate: journeyData.recallDateString,
        returnToCustodyDate: journeyData.returnToCustodyDateString || journeyData.recallDateString,
        // @ts-expect-error recallType will be correct
        recallType: journeyData.recallType.code,
        createdByUsername: username,
      }
      await req.services.recallService.postRecall(recallToSave, username)

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
