import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'
import CourtCaseService from '../services/CourtCaseService'

/**
 * Middleware to load court cases details into res.locals
 */
export default function loadCourtCases(courtCaseService: CourtCaseService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { nomisId, user } = res.locals

    if (!nomisId || !user?.username) {
      logger.warn('Missing nomisId or username in res.locals')
      return next()
    }

    try {
      const recallableCourtCases = await courtCaseService.getAllRecallableCourtCases(nomisId, user.username)
      res.locals.recallableCourtCases = recallableCourtCases
      logger.debug(`Court cases details loaded for ${nomisId}`)
    } catch (error) {
      logger.error(error, `Failed to retrieve Court cases for: ${nomisId}`)
      res.locals.recallableCourtCases = null
    }
    return next()
  }
}
