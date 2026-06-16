import { RequestHandler } from 'express'
import logger from '../../logger'
import PrisonerSearchService from '../services/prisonerSearchService'
import { PrisonUser } from '../interfaces/hmppsUser'

export default function populateCurrentPrisoner(prisonerSearchService: PrisonerSearchService): RequestHandler {
  return async (req, res, next) => {
    const { nomsId } = req.params as { nomsId: string }
    const { username } = res.locals.user as PrisonUser

    if (username && nomsId) {
      try {
        const prisoner = await prisonerSearchService.getPrisonerDetails(nomsId, username)
        res.locals.prisoner = prisoner
      } catch (error) {
        logger.error(error, `Failed to get prisoner with prisoner number: ${nomsId}`)
        next(error)
      }
    }

    return next()
  }
}
