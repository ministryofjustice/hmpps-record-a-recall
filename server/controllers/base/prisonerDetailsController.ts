import { NextFunction, Response } from 'express'
import FormWizard from 'hmpo-form-wizard'
import logger from '../../../logger'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import FormInitialStep from './formInitialStep'
import { SessionManager } from '../../services/sessionManager'

export default class PrisonerDetailsController extends FormInitialStep {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.getPrisoner)
  }

  locals(req: FormWizard.Request, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner = SessionManager.getSessionValue<PrisonerSearchApiPrisoner>(
      req,
      SessionManager.SESSION_KEYS.PRISONER,
    )
    const nomisId = prisoner?.prisonerNumber

    // Ensure prisoner data is also available in res.locals for template consistency
    res.locals.prisoner = prisoner
    res.locals.nomisId = nomisId

    return { ...locals, prisoner, nomisId }
  }

  async getPrisoner(req: FormWizard.Request, res: Response, next: NextFunction) {
    const { nomisId, username } = res.locals
    const sessionPrisoner = SessionManager.getSessionValue<PrisonerSearchApiPrisoner>(
      req,
      SessionManager.SESSION_KEYS.PRISONER,
    )

    if (!sessionPrisoner) {
      try {
        const newPrisoner = await req.services.prisonerService.getPrisonerDetails(nomisId, username)

        // Store in session for form wizard
        SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.PRISONER, newPrisoner)
        SessionManager.save(req)

        // Also populate res.locals for template consistency
        res.locals.prisoner = newPrisoner

        logger.debug(`Prisoner details loaded and cached for ${nomisId}`)
        next()
      } catch (error) {
        logger.error(error, `Failed to retrieve prisoner details for: ${nomisId}`)
        SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.PRISONER, null)
        res.locals.prisoner = null
        next(error)
      }
    } else {
      // Use cached data from session
      res.locals.prisoner = sessionPrisoner
      next()
    }
  }
}
