import { Request, Response } from 'express'
import { SessionManager } from '../../services/sessionManager'
import ValidationService from '../../validation/service'
import { createFieldError } from '../../validation/utils/errorFormatting'

/**
 * Base controller for controllers migrated from FormWizard to Zod validation
 * Encapsulates common patterns and temporary workarounds during migration
 *
 * TODO: Refactor once SessionManager is updated to use Express sessions directly
 */
export default abstract class BaseController {
  /**
   * Get session data using SessionManager
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected static getSessionData(req: Request): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return SessionManager.getAllSessionData(req as any)
  }

  /**
   * Update session data using SessionManager
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected static updateSessionData(req: Request, data: Record<string, any>): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SessionManager.updateRecallData(req as any, data)
  }

  /**
   * Set validation error and redirect
   */
  protected static setValidationError(
    req: Request,
    res: Response,
    fieldName: string,
    errorMessage: string,
    redirectUrl: string,
  ): void {
    const validationError = createFieldError(fieldName, errorMessage)
    ValidationService.setSessionErrors(req, validationError)
    res.redirect(redirectUrl)
  }
}
