import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'
import ManageOffencesService from '../services/manageOffencesService'

/**
 * Middleware to load offence names into res.locals
 */
export default function loadOffenceNames(manageOffencesService: ManageOffencesService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { offenceCodes } = res.locals

    console.log('offenceCodes', offenceCodes)

    if (!req.user?.token) {
      logger.warn('Missing token in res.locals')
      return next()
    }

    try {
      const offenceNames = await manageOffencesService.getOffenceMap(offenceCodes, req.user.token)
      res.locals.recallableCourtCases = offenceNames
      logger.debug(`offence names loaded`)
    } catch (error) {
      logger.error(error, `Failed to retrieve offence names`)
      res.locals.recallableCourtCases = null
    }
    return next()
  }
}
