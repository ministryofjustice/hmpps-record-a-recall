import { RequestHandler } from 'express'
import logger from '../../logger'
import { Services } from '../services'
import config from '../config'
import { SessionManager } from '../services/sessionManager'

export default function getFrontendComponents({ feComponentsService }: Services): RequestHandler {
  return async (req, res, next) => {
    if (!config.apis.frontendComponents.enabled) {
      return next()
    }

    try {
      // Check for cached components
      let componentsData = SessionManager.getCachedData(
        req,
        SessionManager.SESSION_KEYS.CACHED_COMPONENTS,
        'COMPONENTS',
      )

      if (!componentsData) {
        // Cache miss - fetch from API
        logger.info('Fetching frontend components from API (cache miss)')
        const { header } = await feComponentsService.getComponents(['header'], res.locals.user.token)

        componentsData = {
          header: header?.html,
          cssIncludes: header?.css || [],
          jsIncludes: header?.javascript || [],
        }

        // Cache the data
        SessionManager.setCachedData(req, SessionManager.SESSION_KEYS.CACHED_COMPONENTS, componentsData)
      } else {
        logger.info('Using cached frontend components')
      }

      res.locals.feComponents = componentsData
      return next()
    } catch (error) {
      logger.error(error, 'Failed to retrieve front end components')
      return next()
    }
  }
}
