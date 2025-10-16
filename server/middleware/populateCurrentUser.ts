import { RequestHandler } from 'express'
import { jwtDecode } from 'jwt-decode'
import logger from '../../logger'
import { convertToTitleCase } from '../utils/utils'
import { Services } from '../services'
import { SessionManager } from '../services/sessionManager'
import { Caseload } from '../data/manageUsersApiClient'

export default function populateCurrentUser({ manageUsersService }: Services): RequestHandler {
  return async (req, res, next) => {
    try {
      const {
        name,
        user_id: userId,
        authorities: roles = [],
      } = jwtDecode(res.locals.user.token) as {
        name?: string
        user_id?: string
        authorities?: string[]
      }

      // Check for cached caseloads data
      let caseloadsData = SessionManager.getCachedData<{ activeCaseload: Caseload; caseloads: Caseload[] }>(
        req,
        SessionManager.SESSION_KEYS.CACHED_CASELOADS,
        'USER_DATA',
      )

      if (!caseloadsData) {
        // Cache miss - fetch from API
        logger.info('Fetching caseloads from API (cache miss)')
        caseloadsData = await manageUsersService.getUserCaseloads(res.locals.user.token)

        // Cache the data
        SessionManager.setCachedData(req, SessionManager.SESSION_KEYS.CACHED_CASELOADS, caseloadsData)
      } else {
        logger.info('Using cached caseloads data')
      }

      res.locals.user = {
        ...res.locals.user,
        userId,
        name,
        displayName: `${convertToTitleCase(name)}`,
        userRoles: roles.map(role => role.substring(role.indexOf('_') + 1)),
        activeCaseload: caseloadsData.activeCaseload,
        caseloads: caseloadsData.caseloads,
      }

      if (res.locals.user.authSource === 'nomis') {
        res.locals.user.staffId = parseInt(userId, 10) || undefined
      }

      next()
    } catch (error) {
      logger.error(error, `Failed to populate user details for: ${res.locals.user && res.locals.user.username}`)
      next(error)
    }
  }
}
