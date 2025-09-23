import { Request, Response, NextFunction } from 'express'
import { ZodError, ZodSchema } from 'zod'
import ValidationService from '../validation/service'
import { SessionManager } from '../services/sessionManager'
import logger from '../../logger'

/**
 * - Stores errors in a format compatible with new Nunjucks filters: { fieldName: ['error message'] }
 * - Supports both Zod schemas and registered step names
 */

/**
 * Deduplicate field errors to prevent duplicate messages
 */
function deduplicateFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, Set<string>> = {}

  error.issues.forEach(issue => {
    // Build path string from path array
    const path = issue.path.filter(p => typeof p === 'string').join('.')
    if (path) {
      fieldErrors[path] = fieldErrors[path] || new Set()
      fieldErrors[path].add(issue.message)
    }
  })

  // Convert Sets back to arrays
  return Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, Array.from(value)]))
}

/**
 * Store data in flash/session with our custom pattern
 * This uses SessionManager but stores in a way compatible with flash patterns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function storeInFlash(req: Request, key: string, value: any): void {
  // Get current session data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = req.session as any

  // Initialize flash storage if it doesn't exist
  if (!session.flash) {
    session.flash = {}
  }

  // Store the value
  session.flash[key] = JSON.stringify(value)
}

/**
 * Read and clear data from flash/session
 * This ensures errors don't persist across unrelated requests
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readAndClearFlash(req: Request, key: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = req.session as any

  if (!session.flash || !session.flash[key]) {
    return null
  }

  const value = session.flash[key]
  delete session.flash[key]

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/**
 * Schema factory type - allows dynamic schema creation based on request
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaFactory<P = any> = (req: Request<P>) => Promise<ZodSchema> | ZodSchema

/**
 *
 * @param schemaOrStepName - Either a Zod schema, a schema factory function, or a registered step name
 *TODO: refractor to only use Zod schema once migration is complete
 * @returns Express middleware function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validate<P extends { [key: string]: string } = any>(
  schemaOrStepName: ZodSchema | SchemaFactory<P> | string,
): (req: Request<P>, res: Response, next: NextFunction) => Promise<void> {
  // eslint-disable-next-line consistent-return
  return async (req: Request<P>, res: Response, next: NextFunction): Promise<void> => {
    try {
      let schema: ZodSchema

      // Resolve the schema
      if (typeof schemaOrStepName === 'string') {
        // It's a registered step name
        const registeredSchema = ValidationService.getSchemaForStep(schemaOrStepName)
        if (!registeredSchema) {
          throw new Error(`No schema registered for step: ${schemaOrStepName}`)
        }
        schema = registeredSchema
      } else if (typeof schemaOrStepName === 'function') {
        // It's a schema factory
        schema = await schemaOrStepName(req)
      } else {
        // It's a direct schema
        schema = schemaOrStepName
      }

      // Validate the request body
      const result = schema.safeParse(req.body)

      if (result.success) {
        // Replace request body with validated and transformed data
        req.body = result.data
        return next()
      }

      // Validation failed - prepare errors for template
      const deduplicatedErrors = deduplicateFieldErrors(result.error)

      // Store errors and form responses in flash
      storeInFlash(req, 'validationErrors', deduplicatedErrors)
      storeInFlash(req, 'formResponses', req.body)

      // Also store in the format expected by sessionModelAdapter for compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SessionManager.setSessionValue(req as any, 'validationErrors', deduplicatedErrors)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SessionManager.setSessionValue(req as any, 'formResponses', req.body)

      // Redirect back with fragment to prevent field focus
      const redirectUrl = `${req.originalUrl}#`
      return res.redirect(redirectUrl)
    } catch (error) {
      logger.error('Validation middleware error:', error)
      next(error)
    }
  }
}

/**
 * Middleware to populate res.locals from flash data
 * This should be used on GET routes to display validation errors
 */
export function populateValidationData(req: Request, res: Response, next: NextFunction): void {
  // Try to read from flash first
  let errors = readAndClearFlash(req, 'validationErrors')
  let values = readAndClearFlash(req, 'formResponses')

  // If not in flash, check SessionManager (for compatibility during migration)
  if (!errors && !values) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors = SessionManager.getSessionValue(req as any, 'validationErrors')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values = SessionManager.getSessionValue(req as any, 'formResponses')

    if (errors || values) {
      // Clear from session after reading
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SessionManager.setSessionValue(req as any, 'validationErrors', undefined)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SessionManager.setSessionValue(req as any, 'formResponses', undefined)
    }
  }

  // Populate res.locals for template access
  if (errors) {
    res.locals.validationErrors = errors
  }

  if (values) {
    res.locals.formResponses = values
    // Also set formValues for backward compatibility with existing templates
    res.locals.formValues = values
  }

  next()
}

/**
 * Clear all validation data from session
 * Useful for ensuring clean state between form submissions
 */
export function clearValidation(req: Request): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = req.session as any

  // Clear from flash
  if (session.flash) {
    delete session.flash.validationErrors
    delete session.flash.formResponses
  }

  // Clear from SessionManager
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SessionManager.setSessionValue(req as any, 'validationErrors', undefined)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SessionManager.setSessionValue(req as any, 'formResponses', undefined)
}
