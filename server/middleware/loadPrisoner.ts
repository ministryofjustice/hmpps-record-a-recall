import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'
import PrisonerService from '../services/prisonerService'

/**
 * Middleware to load prisoner details into res.locals
 */
export default function loadPrisoner(prisonerService: PrisonerService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { nomisId, user } = res.locals

    if (!nomisId || !user?.username) {
      logger.warn('Missing nomisId or username in res.locals')
      return next()
    }

    try {
      const prisoner = await prisonerService.getPrisonerDetails(nomisId, user.username)
      res.locals.prisoner = prisoner
      logger.debug(`Prisoner details loaded for ${nomisId}`)
    } catch (error) {
      logger.error(error, `Failed to retrieve prisoner details for: ${nomisId}`)
      res.locals.prisoner = null
    }

    return next()
  }
}
