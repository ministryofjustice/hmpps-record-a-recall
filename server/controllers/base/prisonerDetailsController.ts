import { NextFunction, Response } from 'express'
import logger from '../../../logger'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import FormInitialStep from './formInitialStep'
import { ExtendedRequest } from './ExpressBaseController'
import { sessionModelFields } from '../../helpers/recallSessionHelper'
import { getSessionValue, setSessionValue, unsetSessionValue, saveSession } from '../../helpers/sessionHelper'

export default class PrisonerDetailsController extends FormInitialStep {
  middlewareSetup() {
    super.middlewareSetup()
    this.use(this.getPrisoner)
  }

  checkJourneyProgress(req: ExtendedRequest, res: Response, next: NextFunction) {
    // Default implementation - can be overridden by subclasses
    next()
  }

  locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner = getSessionValue(req, sessionModelFields.PRISONER) as PrisonerSearchApiPrisoner
    const nomisId = prisoner?.prisonerNumber

    // Ensure prisoner data is also available in res.locals for template consistency
    res.locals.prisoner = prisoner
    res.locals.nomisId = nomisId

    return { ...locals, prisoner, nomisId }
  }

  async getPrisoner(req: ExtendedRequest, res: Response, next: NextFunction) {
    const { nomisId, username } = res.locals
    const sessionPrisoner = getSessionValue(req, sessionModelFields.PRISONER) as PrisonerSearchApiPrisoner

    if (!sessionPrisoner) {
      try {
        const newPrisoner = await req.services.prisonerService.getPrisonerDetails(nomisId, username)

        // Store in session
        setSessionValue(req, sessionModelFields.PRISONER, newPrisoner)
        saveSession(req)

        // Also populate res.locals for template consistency
        res.locals.prisoner = newPrisoner

        logger.debug(`Prisoner details loaded and cached for ${nomisId}`)
        next()
      } catch (error) {
        logger.error(error, `Failed to retrieve prisoner details for: ${nomisId}`)
        unsetSessionValue(req, sessionModelFields.PRISONER)
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
