import { Request } from 'express'
import logger from '../../logger'
import { SessionManager } from './sessionManager'

export default class CachingService {
  /**
   * Wraps an API call with caching logic
   * @param req - Express request object
   * @param cacheKey - Key to store/retrieve cached data
   * @param ttlKey - TTL configuration key
   * @param apiCall - Function that makes the API call
   * @param options - Additional options
   * @returns Cached data or fresh API response
   */
  static async withCache<T>(
    req: Request,
    cacheKey: string,
    ttlKey: keyof typeof SessionManager.CACHE_TTL,
    apiCall: () => Promise<T>,
    options: {
      skipCache?: boolean
      forceRefresh?: boolean
      onCacheHit?: (data: T) => void
      onCacheMiss?: () => void
      onError?: (error: unknown) => void
    } = {},
  ): Promise<T> {
    const { skipCache = false, forceRefresh = false, onCacheHit, onCacheMiss, onError } = options

    // Skip cache if requested
    if (skipCache || forceRefresh) {
      try {
        logger.info(`Skipping cache for ${cacheKey} (${skipCache ? 'skipCache' : 'forceRefresh'})`)
        const data = await apiCall()

        // Cache the fresh data
        SessionManager.setCachedData(req, cacheKey, data)

        return data
      } catch (error) {
        if (onError) {
          onError(error)
        }
        throw error
      }
    }

    // Try to get cached data first
    const cachedData = SessionManager.getCachedData<T>(req, cacheKey, ttlKey)

    if (cachedData) {
      if (onCacheHit) {
        onCacheHit(cachedData)
      }
      return cachedData
    }

    // Cache miss - make API call
    try {
      if (onCacheMiss) {
        onCacheMiss()
      }

      const data = await apiCall()

      // Cache the fresh data
      SessionManager.setCachedData(req, cacheKey, data)

      return data
    } catch (error) {
      if (onError) {
        onError(error)
      }
      throw error
    }
  }

  /**
   * Creates a cache key for prisoner-specific data
   */
  static createPrisonerCacheKey(baseKey: string, prisonerId: string): string {
    return `${baseKey}_${prisonerId}`
  }

  /**
   * Creates a cache key for user-specific data
   */
  static createUserCacheKey(baseKey: string, userId: string): string {
    return `${baseKey}_${userId}`
  }

  /**
   * Bulk invalidation of related caches
   */
  static invalidateRelatedCaches(req: Request, patterns: string[]): void {
    try {
      patterns.forEach(pattern => {
        SessionManager.invalidateCache(req, pattern)
      })
      logger.info(`Invalidated ${patterns.length} related caches`)
    } catch (error) {
      logger.error('Error invalidating related caches:', error)
    }
  }

  /**
   * Check if multiple cache keys exist
   */
  static checkMultipleCaches(
    req: Request,
    cacheChecks: Array<{ key: string; ttl: keyof typeof SessionManager.CACHE_TTL }>,
  ): Record<string, boolean> {
    const results: Record<string, boolean> = {}

    cacheChecks.forEach(({ key, ttl }) => {
      const cached = SessionManager.getCachedData(req, key, ttl)
      results[key] = cached !== null
    })

    return results
  }

  /**
   * Preload caches for multiple data types
   */
  static async preloadCaches(
    req: Request,
    preloadTasks: Array<{
      key: string
      ttl: keyof typeof SessionManager.CACHE_TTL
      loader: () => Promise<unknown>
    }>,
  ): Promise<void> {
    const promises = preloadTasks.map(async ({ key, ttl, loader }) => {
      try {
        const cached = SessionManager.getCachedData(req, key, ttl)
        if (!cached) {
          const data = await loader()
          SessionManager.setCachedData(req, key, data)
          logger.info(`Preloaded cache for ${key}`)
        }
      } catch (error) {
        logger.error(`Error preloading cache for ${key}:`, error)
      }
    })

    await Promise.allSettled(promises)
  }
}
