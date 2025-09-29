import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'
import PrisonerService from '../services/prisonerService'

/**
 * Middleware to load prisoner details into res.locals
 * Supports both factory pattern (for dependency injection) and direct usage (for V2 routes)
 *
 * @param prisonerService - Optional prisoner service for dependency injection pattern
 * @param options - Configuration options
 * @param options.checkSession - Whether to check session for existing prisoner data (default: false)
 * @param options.updateSession - Whether to update session with loaded prisoner data (default: false)
 */
export default function loadPrisoner(
  prisonerService?: PrisonerService,
  options: { checkSession?: boolean; updateSession?: boolean } = {},
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { nomisId, user, username } = res.locals
    const userUsername = user?.username || username

    // Check if prisoner data is already loaded
    if (res.locals.prisoner) {
      return next()
    }

    // Check session first if enabled (for V2 compatibility)
    if (options.checkSession) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionData = req.session as any

      // Check FormWizard session namespaces
      const wizardKeys = ['hmpo-wizard-record-recall', 'hmpo-wizard-edit-recall']
      for (const key of wizardKeys) {
        if (sessionData?.[key]?.prisoner) {
          res.locals.prisoner = sessionData[key].prisoner
          return next()
        }
      }

      // Also check direct session storage (V2 pattern via sessionModelAdapter)
      if (sessionData?.prisoner) {
        res.locals.prisoner = sessionData.prisoner
        return next()
      }
    }

    if (!nomisId || !userUsername) {
      logger.warn('Missing nomisId or username in res.locals')
      return next()
    }

    try {
      // Use provided service or get from request (V2 pattern)
      const service = prisonerService || req.services?.prisonerService
      if (!service) {
        logger.error('No prisoner service available')
        return next()
      }

      const prisoner = await service.getPrisonerDetails(nomisId, userUsername)
      res.locals.prisoner = prisoner

      // Update session if enabled (for V2 compatibility)
      if (options.updateSession && req.session) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionData = req.session as any
        sessionData.prisoner = prisoner

        // Also update FormWizard namespaces if they exist
        if (sessionData['hmpo-wizard-record-recall']) {
          sessionData['hmpo-wizard-record-recall'].prisoner = prisoner
        }
        if (sessionData['hmpo-wizard-edit-recall']) {
          sessionData['hmpo-wizard-edit-recall'].prisoner = prisoner
        }
      }

      logger.debug(`Prisoner details loaded for ${nomisId}`)
    } catch (error) {
      logger.error(error, `Failed to retrieve prisoner details for: ${nomisId}`)
      // V2 pattern continues without setting null, original pattern sets null
      if (!options.checkSession) {
        res.locals.prisoner = null
      }
    }

    return next()
  }
}
