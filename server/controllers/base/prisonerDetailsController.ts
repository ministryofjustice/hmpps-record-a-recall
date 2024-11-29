import { NextFunction, Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import logger from '../../../logger'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import FormInitialStep from './formInitialStep'

export default class PrisonerDetailsController extends FormInitialStep {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.getPrisoner)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner = req.sessionModel.get<PrisonerSearchApiPrisoner>('prisoner')
    const nomisId = prisoner?.prisonerNumber

    return { ...locals, prisoner, nomisId }
  }

  async getPrisoner(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { nomisId, username } = res.locals
    const sessionPrisoner = req.sessionModel.get<PrisonerSearchApiPrisoner>('prisoner')

    if (!sessionPrisoner) {
      req.services.prisonerService
        .getPrisonerDetails(nomisId, username)
        .then(newPrisoner => {
          console.log('Retrieved prisoner details from Prisoner search')
          req.sessionModel.set('prisoner', newPrisoner)
          req.sessionModel.save()
          next()
        })
        .catch(error => {
          logger.error(error, `Failed to retrieve prisoner details for: ${nomisId}`)
          req.sessionModel.unset('prisoner')
          next(error)
        })
    } else {
      console.log('Retrieved prisoner details from session')
      next()
    }
  }
}
