import { RequestHandler } from 'express'
import logger from '../../logger'
import { SessionManager } from '../services/sessionManager'

/**
 * Middleware to handle cache invalidation on logout
 */
export function invalidateCacheOnLogout(): RequestHandler {
  return (req, res, next) => {
    try {
      // Clear all caches when user logs out
      SessionManager.invalidateCache(req)
      logger.info('Cache invalidated on logout')
    } catch (error) {
      logger.error('Error invalidating cache on logout:', error)
    }
    next()
  }
}

/**
 * Middleware to handle cache invalidation when recall workflow starts
 */
export function invalidateWorkflowCache(): RequestHandler {
  return (req, res, next) => {
    try {
      const { nomisId } = req.params
      if (nomisId) {
        // Clear prisoner-specific caches when starting a new recall workflow
        SessionManager.clearPrisonerRelatedCache(req, nomisId)
        logger.info(`Workflow cache cleared for prisoner ${nomisId}`)
      }
    } catch (error) {
      logger.error('Error invalidating workflow cache:', error)
    }
    next()
  }
}

/**
 * Middleware to handle cache invalidation when data is updated
 */
export function invalidateCacheOnDataUpdate(): RequestHandler {
  return (req, res, next) => {
    try {
      const { nomisId } = req.params
      if (nomisId) {
        // Clear prisoner-specific caches when data is updated
        SessionManager.clearPrisonerRelatedCache(req, nomisId)
        logger.info(`Data update cache cleared for prisoner ${nomisId}`)
      }
    } catch (error) {
      logger.error('Error invalidating cache on data update:', error)
    }
    next()
  }
}

/**
 * Utility function to clear expired caches periodically
 */
export function cleanupExpiredCaches(): RequestHandler {
  return (req, res, next) => {
    try {
      // This would typically be called by a scheduled job
      // For now, we'll rely on the TTL checks in getCachedData
      logger.debug('Cache cleanup check performed')
    } catch (error) {
      logger.error('Error during cache cleanup:', error)
    }
    next()
  }
}
