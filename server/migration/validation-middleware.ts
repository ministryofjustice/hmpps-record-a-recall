/* eslint-disable @typescript-eslint/no-explicit-any, no-await-in-loop */
import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import logger from '../../logger'
import SessionWrapper from './session-wrapper'
import { formatZodErrors } from './zod-helpers'

interface RequestWithValidatedData extends Request {
  validatedData?: unknown
  session: any
}

export function validateWithZod(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = new SessionWrapper(req as RequestWithValidatedData)
      const result = await schema.safeParseAsync(req.body)

      if (!result.success) {
        // Format errors for HMPO template compatibility
        const errors = formatZodErrors(result.error)
        session.setErrors(errors)
        session.setFormValues(req.body)

        // Redirect back to the same URL to show errors
        res.redirect(req.originalUrl)
        return
      }

      // Store validated data on request for use in route handler
      ;(req as RequestWithValidatedData).validatedData = result.data

      // Clear any previous errors
      session.clearErrors()

      next()
    } catch (error) {
      logger.error('Validation middleware error:', error)
      next(error)
    }
  }
}

export function validateWithZodPartial(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = new SessionWrapper(req as RequestWithValidatedData)
      // Use partial validation to allow optional fields
      // Cast to ZodObject to use partial()
      const partialSchema = (schema as z.ZodObject<any>).partial()
      const result = await partialSchema.safeParseAsync(req.body)

      if (!result.success) {
        const errors = formatZodErrors(result.error)
        session.setErrors(errors)
        session.setFormValues(req.body)
        res.redirect(req.originalUrl)
        return
      }

      ;(req as RequestWithValidatedData).validatedData = result.data
      session.clearErrors()
      next()
    } catch (error) {
      logger.error('Partial validation middleware error:', error)
      next(error)
    }
  }
}

export function conditionalValidation(conditionFn: (req: Request) => boolean, schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if validation should be applied
    if (!conditionFn(req)) {
      ;(req as RequestWithValidatedData).validatedData = req.body
      next()
      return
    }

    // Apply validation
    await validateWithZod(schema)(req, res, next)
  }
}

export function combineValidators(...validators: z.ZodSchema[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = new SessionWrapper(req as RequestWithValidatedData)
    const allErrors: Record<string, { type: string; message: string }> = {}
    let hasErrors = false

    // Run all validators and collect errors

    for (const validator of validators) {
      const result = await validator.safeParseAsync(req.body)
      if (!result.success) {
        const errors = formatZodErrors(result.error)
        Object.assign(allErrors, errors)
        hasErrors = true
      }
    }

    if (hasErrors) {
      session.setErrors(allErrors)
      session.setFormValues(req.body)
      res.redirect(req.originalUrl)
      return
    }

    ;(req as RequestWithValidatedData).validatedData = req.body
    session.clearErrors()
    next()
  }
}
