import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'
import CourtCaseService from '../services/CourtCaseService'
import ManageOffencesService from '../services/manageOffencesService'

/**
 * Middleware to load court cases and offence names into res.locals
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
      console.log('recallableCourtCases:-------------------', JSON.stringify(recallableCourtCases, undefined, 2))
      res.locals.recallableCourtCases = recallableCourtCases
      logger.debug(`Court cases details loaded for ${nomisId}`)

      const offenceCodes = recallableCourtCases
        .flatMap(courtCase => courtCase.sentences || [])
        .map(sentence => sentence.offenceCode)
        .filter(code => !!code)

      if (offenceCodes.length > 0 && user?.token) {
        const offenceNameMap = await new ManageOffencesService().getOffenceMap(offenceCodes, user.token)
        res.locals.offenceNameMap = offenceNameMap
        logger.debug(`Offence names loaded for ${nomisId}`)
      } else {
        res.locals.offenceNameMap = {}
      }

    } catch (error) {
      logger.error(error, `Failed to retrieve court cases or offence names for: ${nomisId}`)
      res.locals.recallableCourtCases = null
      res.locals.offenceNameMap = {}
    }

    return next()
  }
}


