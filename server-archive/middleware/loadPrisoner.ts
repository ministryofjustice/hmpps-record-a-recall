import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'
import PrisonerService from '../services/prisonerService'
import { SessionManager } from '../services/sessionManager'

/**
 * Middleware to load prisoner details into res.locals with caching
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

    if (!nomisId || !userUsername) {
      logger.warn('Missing nomisId or username in res.locals')
      return next()
    }

    // Check for cached prisoner data
    const cachedPrisonerData =
      SessionManager.getSessionValue<Record<string, unknown>>(req, SessionManager.SESSION_KEYS.CACHED_PRISONER_DATA) ||
      {}

    // Check if we have cached data for this prisoner
    if (cachedPrisonerData[nomisId]) {
      const cacheKey = `${SessionManager.SESSION_KEYS.CACHED_PRISONER_DATA}_${nomisId}`
      const cachedPrisoner = SessionManager.getCachedData(req, cacheKey, 'PRISONER_DATA')

      if (cachedPrisoner) {
        logger.info(`Using cached prisoner data for ${nomisId}`)
        res.locals.prisoner = cachedPrisoner

        // Update session if enabled
        if (options.updateSession && req.session) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sessionData = req.session as any
          sessionData.prisoner = cachedPrisoner
        }

        return next()
      }
    }

    // Check session first if enabled (for V2 compatibility)
    if (options.checkSession) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionData = req.session as any

      // Check direct session storage
      if (sessionData?.prisoner) {
        res.locals.prisoner = sessionData.prisoner
        return next()
      }
    }

    try {
      // Use provided service or get from request (V2 pattern)
      const service = prisonerService || req.services?.prisonerService
      if (!service) {
        logger.error('No prisoner service available')
        return next()
      }

      logger.info(`Fetching prisoner data from API for ${nomisId} (cache miss)`)
      const prisoner = await service.getPrisonerDetails(nomisId, userUsername)
      res.locals.prisoner = prisoner

      // Cache the prisoner data
      const cacheKey = `${SessionManager.SESSION_KEYS.CACHED_PRISONER_DATA}_${nomisId}`
      SessionManager.setCachedData(req, cacheKey, prisoner)

      // Update the prisoner data index
      cachedPrisonerData[nomisId] = true
      SessionManager.setSessionValue(req, SessionManager.SESSION_KEYS.CACHED_PRISONER_DATA, cachedPrisonerData)

      // Update session if enabled
      if (options.updateSession && req.session) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionData = req.session as any
        sessionData.prisoner = prisoner
      }

      logger.debug(`Prisoner details loaded and cached for ${nomisId}`)
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
