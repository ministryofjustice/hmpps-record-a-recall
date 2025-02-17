import { NextFunction, Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import logger from '../../../logger'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import FormInitialStep from './formInitialStep'
import { sessionModelFields } from '../../helpers/formWizardHelper'

export default class PrisonerDetailsController extends FormInitialStep {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.getPrisoner)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner = req.sessionModel.get<PrisonerSearchApiPrisoner>(sessionModelFields.PRISONER)
    const nomisId = prisoner?.prisonerNumber

    return { ...locals, prisoner, nomisId }
  }

  async getPrisoner(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { nomisId, username } = res.locals
    const sessionPrisoner = req.sessionModel.get<PrisonerSearchApiPrisoner>(sessionModelFields.PRISONER)

    if (!sessionPrisoner) {
      req.services.prisonerService
        .getPrisonerDetails(nomisId, username)
        .then(newPrisoner => {
          req.sessionModel.set(sessionModelFields.PRISONER, newPrisoner)
          req.sessionModel.save()
          next()
        })
        .catch(error => {
          logger.error(error, `Failed to retrieve prisoner details for: ${nomisId}`)
          req.sessionModel.unset(sessionModelFields.PRISONER)
          next(error)
        })
    } else {
      next()
    }
  }
}
