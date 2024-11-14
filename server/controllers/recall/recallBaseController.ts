import { NextFunction, Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import FormInitialStep from '../base/formInitialStep'
import logger from '../../../logger'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import { CalculatedReleaseDates } from '../../@types/calculateReleaseDatesApi/calculateReleaseDatesTypes'

export default class RecallBaseController extends FormInitialStep {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.getPrisoner)
    this.use(this.getTemporaryCalculation)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner = req.sessionModel.get<PrisonerSearchApiPrisoner>('prisoner')
    const calculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    const recallDate = req.sessionModel.get('recallDate')
    const nomisId = prisoner?.prisonerNumber

    return { ...locals, prisoner, calculation, recallDate, nomisId }
  }

  async getPrisoner(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { nomisId, username } = res.locals
    const sessionPrisoner = req.sessionModel.get<PrisonerSearchApiPrisoner>('prisoner')

    if (!sessionPrisoner) {
      req.services.prisonerService
        .getPrisonerDetails(nomisId, username)
        .then(newPrisoner => {
          req.sessionModel.set('prisoner', newPrisoner)
          req.sessionModel.save()
          next()
        })
        .catch(error => {
          logger.error(error, `Failed to retrieve prisoner details for: ${nomisId}`)
          res.redirect('/search')
        })
    } else {
      next()
    }
  }

  async getTemporaryCalculation(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { nomisId, username } = res.locals
    const temporaryCalculation = req.sessionModel.get<CalculatedReleaseDates>('temporaryCalculation')
    if (!temporaryCalculation) {
      req.services.calculationService
        .calculateTemporaryDates(nomisId, username)
        .then(newCalc => {
          req.sessionModel.set('temporaryCalculation', newCalc)
          req.sessionModel.save()
          next()
          // TODO Don't crash the service if we fail here, redirect to not-possible
        })
        .catch(error => {
          req.sessionModel.unset('temporaryCalculation')
          req.sessionModel.set('crdsError', error.userMessage)
          next()
        })
    } else {
      next()
    }
  }
}
