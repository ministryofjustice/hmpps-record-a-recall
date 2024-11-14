import FormWizard from 'hmpo-form-wizard'
import { NextFunction, Response } from 'express'

import RecallBaseController from './recallBaseController'
import {
  CalculatedReleaseDates,
  CalculationBreakdown,
} from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import { groupSentencesByRecallDate } from '../../utils/sentenceUtils'

export default class CheckSentencesController extends RecallBaseController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.getSentences)
    this.use(this.getCalculationBreakdown)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const breakdown = req.sessionModel.get<CalculationBreakdown>('breakdown')
    const recallDate = new Date(req.sessionModel.get<string>('recallDate'))

    res.locals.groupedSentences = groupSentencesByRecallDate(breakdown, recallDate)

    return super.locals(req, res)
  }

  async getSentences(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { username } = req.user
    const temporaryCalculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    if (temporaryCalculation) {
      req.services.calculationService
        .getSentencesAndReleaseDates(temporaryCalculation.calculationRequestId, username)
        .then(sentences => {
          req.sessionModel.set('sentences', sentences)
          req.sessionModel.save()
          next()
          // TODO Don't crash the service if we fail here, redirect to not-possible
        })
        .catch(error => {
          req.sessionModel.unset('sentences')
          req.sessionModel.set('crdsError', error.userMessage)
          next()
        })
    } else {
      next()
    }
  }

  async getCalculationBreakdown(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { username } = req.user
    const temporaryCalculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    if (temporaryCalculation) {
      req.services.calculationService
        .getCalculationBreakdown(temporaryCalculation.calculationRequestId, username)
        .then(breakdown => {
          req.sessionModel.set('breakdown', breakdown)
          req.sessionModel.save()
          next()
          // TODO Don't crash the service if we fail here, redirect to not-possible
        })
        .catch(error => {
          req.sessionModel.unset('sentences')
          req.sessionModel.set('crdsError', error.userMessage)
          next()
        })
    } else {
      next()
    }
  }
}
