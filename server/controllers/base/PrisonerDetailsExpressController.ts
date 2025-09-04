import { NextFunction, Response } from 'express'
import logger from '../../../logger'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'
import ExpressBaseController, { ExtendedRequest } from './ExpressBaseController'
import { sessionModelFields } from '../../helpers/formWizardHelper'

export default class PrisonerDetailsExpressController extends ExpressBaseController {
  protected middlewareSetup() {
    super.middlewareSetup()
    this.use(this.getPrisoner.bind(this))
  }

  protected checkJourneyProgress(req: ExtendedRequest, res: Response, next: NextFunction) {
    // Default implementation - can be overridden by subclasses
    next()
  }

  public locals(req: ExtendedRequest, res: Response): Record<string, unknown> {
    const locals = super.locals(req, res)
    const prisoner = req.session?.formData?.[sessionModelFields.PRISONER] as PrisonerSearchApiPrisoner
    const nomisId = prisoner?.prisonerNumber

    // Ensure prisoner data is also available in res.locals for template consistency
    res.locals.prisoner = prisoner
    res.locals.nomisId = nomisId

    return { ...locals, prisoner, nomisId }
  }

  protected async getPrisoner(req: ExtendedRequest, res: Response, next: NextFunction) {
    const { nomisId, username } = res.locals

    // Get prisoner from session if available
    const sessionPrisoner = req.session?.formData?.[sessionModelFields.PRISONER] as PrisonerSearchApiPrisoner

    if (!sessionPrisoner) {
      try {
        const newPrisoner = await req.services.prisonerService.getPrisonerDetails(nomisId, username)

        // Store in session
        if (!req.session) {
          req.session = {} as Express.Request['session']
        }
        if (!req.session.formData) {
          req.session.formData = {}
        }
        req.session.formData[sessionModelFields.PRISONER] = newPrisoner

        // Also populate res.locals for template consistency
        res.locals.prisoner = newPrisoner

        logger.debug(`Prisoner details loaded and cached for ${nomisId}`)
        next()
      } catch (error) {
        logger.error(error, `Failed to retrieve prisoner details for: ${nomisId}`)

        if (req.session?.formData) {
          delete req.session.formData[sessionModelFields.PRISONER]
        }
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
