import { RequestHandler } from 'express'
import type { Session, SessionData } from 'express-session'
import logger from '../../logger'
import PrisonerSearchService from '../services/prisonerSearchService'
import { PrisonUser } from '../interfaces/hmppsUser'
import { restoreAndClearSession } from '../data/sessionRecoveryStore'

/**
 * Merges journey data recovered from sessionRecoveryStore into a (new) session. Excludes `cookie`:
 * that's session-store-owned metadata (expiry etc.) for the old, now-destroyed session and must not
 * overwrite the new session's own cookie.
 */
function restoreJourneySession(currentSession: Session & Partial<SessionData>, recovered: Partial<SessionData>) {
  const { cookie, ...journeyData } = recovered as Record<string, unknown>
  Object.assign(currentSession, journeyData)
}

export default function populateCurrentPrisoner(prisonerSearchService: PrisonerSearchService): RequestHandler {
  return async (req, res, next) => {
    const { nomsId } = req.params as { nomsId: string }
    const { username } = res.locals.user as PrisonUser

    if (username && nomsId) {
      try {
        const prisoner = await prisonerSearchService.getPrisonerDetails(nomsId, username)
        res.locals.prisoner = prisoner

        const recoveredSession = await restoreAndClearSession(username, nomsId)
        if (recoveredSession) {
          restoreJourneySession(req.session, recoveredSession)
          logger.info(`Restored session data for user ${username} and prisoner ${nomsId} after token refresh`)
        }
      } catch (error) {
        logger.error(error, `Failed to get prisoner with prisoner number: ${nomsId}`)
        next(error)
      }
    }

    return next()
  }
}
