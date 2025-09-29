import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'

/**
 * Middleware that adds FormWizard-compatible sessionModel to Express requests
 * This bridges the gap during migration from FormWizard to pure Express/Zod
 * TODO: Remove this adapter once SessionManager is refactored to use Express sessions directly
 */
export function sessionModelAdapter(req: Request, res: Response, next: NextFunction) {
  // Add sessionModel with FormWizard-compatible interface
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(req as any).sessionModel = {
    get: <T>(key: string): T | undefined => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (req.session as any)?.[key] as T
    },
    set: (key: string, value: unknown, _options?: { silent?: boolean }) => {
      if (req.session) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(req.session as any)[key] = value
      }
    },
    unset: (key: string | string[]) => {
      if (req.session) {
        const keys = Array.isArray(key) ? key : [key]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        keys.forEach(k => delete (req.session as any)[k])
      }
    },
    save: (callback?: (err?: Error) => void) => {
      if (req.session?.save) {
        req.session.save(err => {
          if (err) {
            logger.error('Session save error:', err)
            // Propagate error to callback if provided
            if (callback) {
              callback(err)
              return
            }
            // Also propagate to Express error handler if no callback
            // This ensures session save failures are properly handled
            next(err)
            return
          }
          if (callback) {
            callback(null)
          }
        })
      } else if (callback) {
        callback(null)
      }
    },
    toJSON: () => req.session || {},
    reset: () => {
      if (req.session) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.keys(req.session as any).forEach(key => {
          if (key !== 'cookie' && key !== 'id') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (req.session as any)[key]
          }
        })
      }
    },
  }

  next()
}

export default sessionModelAdapter
