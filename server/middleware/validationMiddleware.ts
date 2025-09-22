import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import ValidationService from '../validation/service'
import { hasErrors, FormattedErrors } from '../validation/utils/errorFormatting'
import logger from '../../logger'

/**
 * Validation middleware options
 */
export interface ValidationOptions {
  /**
   * Redirect path on validation failure
   * If not provided, redirects back to the referring page
   */
  redirectOnError?: string | ((req: Request) => string)

  /**
   * Whether to merge validated data into session automatically
   * Default: true
   */
  mergeToSession?: boolean

  /**
   * Custom business rules to apply after schema validation
   */
  businessRules?: (validData: unknown, req: Request) => Promise<{ errors?: unknown }>

  /**
   * Whether to clear previous errors on successful validation
   * Default: true
   */
  clearErrorsOnSuccess?: boolean

  /**
   * Custom error handler
   */
  onError?: (req: Request, res: Response, errors: unknown) => void

  /**
   * Transform data before validation
   */
  transformData?: (data: unknown, req: Request) => unknown
}

/**
 * Creates validation middleware for Express routes
 * Can accept either a Zod schema or a registered step name
 * TODO: Once migration is complete refractor schemaOrStepName to just schema and should only be using ZodSchema type
 */
export function validate(
  schemaOrStepName: ZodSchema | string,
  options: ValidationOptions = {},
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get the schema
      let schema: ZodSchema
      if (typeof schemaOrStepName === 'string') {
        const registeredSchema = ValidationService.getSchemaForStep(schemaOrStepName)
        if (!registeredSchema) {
          throw new Error(`No schema registered for step: ${schemaOrStepName}`)
        }
        schema = registeredSchema
      } else {
        schema = schemaOrStepName
      }

      // Transform data if needed
      let dataToValidate = req.body
      if (options.transformData) {
        dataToValidate = options.transformData(req.body, req)
      }

      // Validate the data
      const validationResult = await ValidationService.validate(schema, dataToValidate)

      if (validationResult.success) {
        // Clear previous errors if configured
        if (options.clearErrorsOnSuccess !== false) {
          ValidationService.clearSessionErrors(req)
        }

        // Apply business rules if provided
        if (options.businessRules) {
          try {
            const businessResult = await options.businessRules(validationResult.data, req)
            if (businessResult && businessResult.errors) {
              ValidationService.setSessionErrors(req, businessResult.errors as FormattedErrors)
              handleValidationError(req, res, businessResult.errors, options)
              return
            }
          } catch (error) {
            logger.error('Business rule validation failed:', error)
            throw error
          }
        }

        // Merge data into session if configured
        if (options.mergeToSession !== false) {
          ValidationService.mergeValidatedData(req, validationResult.data as Record<string, unknown>)
        }

        // Store validated data for controller use
        res.locals.validatedData = validationResult.data

        next()
        return
      }

      // Handle validation errors
      if (validationResult.errors) {
        ValidationService.setSessionErrors(req, validationResult.errors)
        handleValidationError(req, res, validationResult.errors, options)
        return
      }

      // This shouldn't happen but handle it gracefully
      throw new Error('Validation failed without errors')
    } catch (error) {
      logger.error('Validation middleware error:', error)
      next(error)
    }
  }
}

/**
 * Handle validation errors
 */
function handleValidationError(
  req: Request,
  res: Response,
  errors: unknown,
  options: ValidationOptions,
): void | Response {
  // Custom error handler
  if (options.onError) {
    return options.onError(req, res, errors)
  }

  // Determine redirect path
  let redirectPath: string
  if (options.redirectOnError) {
    redirectPath =
      typeof options.redirectOnError === 'function' ? options.redirectOnError(req) : options.redirectOnError
  } else {
    // Default to redirecting back
    redirectPath = req.get('Referer') || req.originalUrl
  }

  // For AJAX requests, return JSON error
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(400).json({ errors })
  }

  // Redirect with errors stored in session
  return res.redirect(redirectPath)
}

/**
 * Middleware to populate form with previous values and errors
 * Should be used in GET routes to display validation errors
 */
export function populateValidationData(req: Request, res: Response, next: NextFunction): void {
  // Get errors from session
  const errors = ValidationService.getSessionErrors(req)
  const formValues = ValidationService.getSessionFormValues(req)

  if (errors && hasErrors(errors)) {
    // Add to res.locals for template rendering
    res.locals.validationErrors = errors.errorSummary
    res.locals.errorlist = Object.entries(errors.errors).map(([key, error]) => ({
      key,
      type: 'validation',
      ...error,
    }))
    res.locals.errors = errors.errors
  }

  // Add form values for re-population
  res.locals.formValues = formValues

  // Clear errors after displaying them
  ValidationService.clearSessionErrors(req)

  next()
}
