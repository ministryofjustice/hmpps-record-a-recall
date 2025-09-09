import { Request } from 'express'

/**
 * Request with validated data from Zod schemas
 */
export interface RequestWithValidatedData<T = unknown> extends Request {
  validatedData?: T
}

/**
 * Type guard to check if request has services
 */
export function hasServices(req: Request): req is Request & Required<Pick<Request, 'services'>> {
  return req.services !== undefined
}

/**
 * Type guard to check if request has form data in session
 */
export function hasFormData(req: Request): boolean {
  return req.session?.formData !== undefined
}
