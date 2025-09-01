import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

export interface ValidatedRequest extends Request {
  validatedData?: unknown
}

export function validateWithZod(schema: z.ZodSchema) {
  return async (req: Request & { validatedData?: unknown }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await schema.safeParseAsync(req.body)

      if (!result.success) {
        const errors = formatZodErrors(result.error)
        req.session.formErrors = errors
        req.session.formValues = req.body
        res.redirect(req.originalUrl)
        return
      }

      req.validatedData = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}

function formatZodErrors(error: z.ZodError): Record<string, { type: string; message: string }> {
  const { fieldErrors } = error.flatten()
  const formattedErrors: Record<string, { type: string; message: string }> = {}

  Object.entries(fieldErrors).forEach(([field, messages]) => {
    if (Array.isArray(messages) && messages.length > 0) {
      formattedErrors[field] = {
        type: 'validation',
        message: String(messages[0]),
      }
    }
  })

  return formattedErrors
}
