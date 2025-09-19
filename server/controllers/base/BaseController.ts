import { Request, Response } from 'express'
import SessionManager from '../../services/sessionManager'
import ValidationService from '../../validation/service'
import { createFieldError } from '../../validation/utils/errorFormatting'
import { prepareSelectedFormWizardFields } from '../../utils/formWizardFieldsHelper'

/**
 * Base controller for controllers migrated from FormWizard to Zod validation
 * Encapsulates common patterns and temporary workarounds during migration
 *
 * TODO: Refactor once SessionManager is updated to use Express sessions directly
 */
export default abstract class BaseController {
  /**
   * Get session data using SessionManager
   * Encapsulates the temporary 'as any' cast needed during migration
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
   * Get validation data from res.locals (populated by middleware)
   */
  protected static getValidationData(res: Response) {
    const { validationErrors, formValues, errorlist } = res.locals
    return {
      validationErrors: validationErrors || {},
      formValues: formValues || {},
      errorlist: errorlist || [],
    }
  }

  /**
   * Prepare fields for FormWizard-style templates
   * TODO: this will no longer be needed once migration is complete
   */
  protected static prepareFields(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fieldConfig: any,
    fieldNames: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors: any,
  ) {
    return prepareSelectedFormWizardFields(fieldConfig, fieldNames, values, errors)
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
   * Set business error and redirect (alias for setValidationError for clarity)
   */
  protected static setBusinessError(
    req: Request,
    res: Response,
    fieldName: string,
    errorMessage: string,
    redirectUrl: string,
  ): void {
    this.setValidationError(req, res, fieldName, errorMessage, redirectUrl)
  }

  /**
   * Common render helper for form pages
   */
  protected static renderForm(
    req: Request,
    res: Response,
    template: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fieldConfig: any,
    fieldNames: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalData: Record<string, any> = {},
  ): void {
    const sessionData = this.getSessionData(req)
    const { validationErrors, formValues, errorlist } = this.getValidationData(res)

    const preparedFields = this.prepareFields(fieldConfig, fieldNames, formValues || sessionData, validationErrors)

    res.render(template, {
      fields: preparedFields,
      validationErrors,
      errorlist,
      errorMessage: req.flash('errorMessage'),
      ...additionalData,
    })
  }
}
