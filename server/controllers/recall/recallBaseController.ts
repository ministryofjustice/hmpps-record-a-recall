import { NextFunction, Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'
import PrisonerDetailsController from '../base/prisonerDetailsController'
import logger from '../../../logger'

export default class RecallBaseController extends PrisonerDetailsController {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.getTemporaryCalculation)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const calculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    const recallDate = req.sessionModel.get('recallDate')
    return { ...locals, calculation, recallDate }
  }

  async getTemporaryCalculation(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { nomisId, username, validationResponse } = res.locals

    const temporaryCalculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    if (!temporaryCalculation && (!validationResponse || validationResponse.length === 0)) {
      req.services.calculationService
        .calculateTemporaryDates(nomisId, username)
        .then(newCalc => {
          res.locals.temporaryCalculation = newCalc
          logger.debug(newCalc.dates)

          req.sessionModel.set('temporaryCalculation', newCalc)
          req.sessionModel.save()
          next()
        })
        .catch(error => {
          req.sessionModel.unset('temporaryCalculation')
          req.sessionModel.set('crdsError', error.userMessage)
          next(error)
        })
    } else {
      next()
    }
  }
}
