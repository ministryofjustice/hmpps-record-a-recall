import { RequestHandler } from 'express'
import logger from '../../logger'
import PrisonerService from '../services/prisonerService'

export default function populateCurrentPrisoner(prisonerService: PrisonerService): RequestHandler {
  return async (req, res, next) => {
    const { nomsId } = req.params
    try {
      const { username } = res.locals.user
      res.locals.prisoner = await prisonerService.getPrisonerDetails(nomsId, username)
      next()
    } catch (error) {
      logger.error(error, `Failed to retrieve prisoner details for: ${nomsId}`)
      next(error)
    }
  }
}
