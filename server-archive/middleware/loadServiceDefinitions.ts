import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'
import CourtCasesReleaseDatesService from '../services/courtCasesReleaseDatesService'

/**
 * Middleware to load service definitions from CRDS into res.locals
 */
export default function loadServiceDefinitions(courtCasesReleaseDatesService: CourtCasesReleaseDatesService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { nomisId } = res.locals

    if (!nomisId || !req.user?.token) {
      logger.warn('Missing nomisId or user token for service definitions')
      return next()
    }

    try {
      const serviceDefinitions = await courtCasesReleaseDatesService.getServiceDefinitions(nomisId, req.user.token)
      res.locals.serviceDefinitions = serviceDefinitions
    } catch (error) {
      logger.error(error, `Failed to load service definitions for ${nomisId}`)
      res.locals.serviceDefinitions = null
    }

    return next()
  }
}
