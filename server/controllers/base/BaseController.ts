import { Request, Response } from 'express'
import { SessionManager } from '../../services/sessionManager'
import ValidationService from '../../validation/service'
import { createFieldError } from '../../validation/utils/errorFormatting'

/**
 * Base controller for controllers migrated from FormWizard to Zod validation
 * Encapsulates common patterns for session management and validation
 */
export default abstract class BaseController {
  /**
   * Get session data using SessionManager
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected static getSessionData(req: Request): any {
    return SessionManager.getAllSessionData(req)
  }

  /**
   * Update session data using SessionManager
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected static updateSessionData(req: Request, data: Record<string, any>): void {
    SessionManager.updateRecallData(req, data)
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

  /**
   * Get UAL to create from session
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected static getUalToCreate(req: Request): any {
    const sessionData = BaseController.getSessionData(req)
    return sessionData?.ualToCreate || null
  }

  /**
   * Get UAL to edit from session
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected static getUalToEdit(req: Request): any {
    const sessionData = BaseController.getSessionData(req)
    return sessionData?.ualToEdit || null
  }
}
