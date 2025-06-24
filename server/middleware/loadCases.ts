import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'
import CourtCaseService from '../services/CourtCaseService'

/**
 * Middleware to load court cases details into res.locals
 */
export default function loadCourCasea(courtCaseService: CourtCaseService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { nomisId, user } = res.locals

    if (!nomisId || !user?.username) {
      logger.warn('Missing nomisId or username in res.locals')
      return next()
    }

    try {
      const recallableCourtCases = await req.services.courtCaseService.getAllRecallableCourtCases(
        user.username,
        nomisId,
      )
      res.locals.recallableCourtCases = recallableCourtCases
      logger.debug(`Court cases details loaded for ${nomisId}`)
      console.log('----------------recallableCourtCases', recallableCourtCases)
    } catch (error) {
      logger.error(error, `Failed to retrieve Court cases for: ${nomisId}`)
      res.locals.recallableCourtCases = null
    }
    return next()
  }
}
