import { Request } from 'express'

/**
 * Helper functions to replace HMPO sessionModel methods with Express session
 * These functions provide a migration path from req.sessionModel to req.session.formData
 */

/**
 * Get a value from the session
 * Replaces: req.sessionModel.get(key)
 * With: getSessionValue(req, key)
 */
export function getSessionValue<T = unknown>(req: Request, key: string): T | undefined {
  if (!req.session?.formData) {
    return undefined
  }
  return req.session.formData[key] as T
}

/**
 * Set a value in the session
 * Replaces: req.sessionModel.set(key, value)
 * With: setSessionValue(req, key, value)
 */
export function setSessionValue(req: Request, key: string, value: unknown): void {
  if (!req.session) {
    throw new Error('Session not initialized')
  }
  if (!req.session.formData) {
    req.session.formData = {}
  }
  req.session.formData[key] = value
}

/**
 * Unset (delete) a value from the session
 * Replaces: req.sessionModel.unset(key)
 * With: unsetSessionValue(req, key)
 */
export function unsetSessionValue(req: Request, key: string): void {
  if (req.session?.formData) {
    delete req.session.formData[key]
  }
}

/**
 * Reset the entire session data
 * Replaces: req.sessionModel.reset()
 * With: resetSessionData(req)
 */
export function resetSessionData(req: Request): void {
  if (req.session) {
    req.session.formData = {}
  }
}

/**
 * Get all session data as JSON
 * Replaces: req.sessionModel.toJSON()
 * With: getSessionJSON(req)
 */
export function getSessionJSON(req: Request): Record<string, unknown> {
  return req.session?.formData || {}
}

/**
 * Save session (Express sessions auto-save, but this provides compatibility)
 * Replaces: req.sessionModel.save(callback)
 * With: saveSession(req, callback)
 */
export function saveSession(req: Request, callback?: (err?: unknown) => void): void {
  if (req.session && typeof req.session.save === 'function') {
    req.session.save(callback)
  } else if (callback) {
    // Express sessions typically auto-save, so just call the callback
    callback()
  }
}

/**
 * Batch update multiple session values
 * Helper for updating multiple values at once
 */
export function updateSessionValues(req: Request, updates: Record<string, unknown>): void {
  if (!req.session) {
    throw new Error('Session not initialized')
  }
  if (!req.session.formData) {
    req.session.formData = {}
  }
  Object.assign(req.session.formData, updates)
}

/**
 * Check if a session key exists
 * Helper to check if a key is set in the session
 */
export function hasSessionValue(req: Request, key: string): boolean {
  return req.session?.formData?.[key] !== undefined
}

/**
 * Get multiple session values at once
 * Helper for retrieving multiple values
 */
export function getSessionValues<T extends Record<string, unknown>>(req: Request, keys: string[]): Partial<T> {
  const result: Partial<T> = {}
  if (req.session?.formData) {
    keys.forEach(key => {
      if (req.session.formData![key] !== undefined) {
        ;(result as Record<string, unknown>)[key] = req.session.formData![key]
      }
    })
  }
  return result
}

/**
 * Clear specific session keys
 * Helper for unsetting multiple keys at once
 */
export function clearSessionValues(req: Request, keys: string[]): void {
  if (req.session?.formData) {
    keys.forEach(key => {
      delete req.session.formData![key]
    })
  }
}
