import { Request, Response, NextFunction } from 'express'
// TODO: Remove FormWizard import once SessionManager is refactored to use Express sessions
import FormWizard from 'hmpo-form-wizard'
import { sanitizeString } from '../../utils/utils'
import logger from '../../../logger'
import config from '../../config'
import SessionManager from '../../services/sessionManager'
import ValidationService from '../../validation/service'
import { createFieldError } from '../../validation/utils/errorFormatting'
import { prepareSelectedFormWizardFields } from '../../utils/formWizardFieldsHelper'
import fields from '../../routes/search/fields'

export default class PersonSearchController {
  static checkForRedirect(req: Request, res: Response, next: NextFunction): void {
    // Check if not in local development and redirect to DPS home
    const isLocalDevelopment = config.domain.includes('localhost') || config.domain.includes('127.0.0.1')

    if (!isLocalDevelopment) {
      res.redirect(config.applications.digitalPrisonServices.url)
      return
    }

    next()
  }

  static async get(req: Request, res: Response): Promise<void> {
    // Get any flash messages
    const errorMessage = req.flash('errorMessage')

    // Get form values and errors from res.locals (populated by populateValidationData middleware)
    const { validationErrors, formValues, errorlist } = res.locals

    // Get any existing nomisId from session
    // TODO: Remove cast once SessionManager is refactored to use Express sessions
    // Check if sessionModel exists (it won't for non-FormWizard routes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sessionData: any = {}
    const formWizardReq = req as unknown as FormWizard.Request
    if (formWizardReq.sessionModel) {
      sessionData = SessionManager.getAllSessionData(formWizardReq)
    }

    // Prepare fields for template rendering using the helper
    // This bridges FormWizard field configs with our new validation approach
    const preparedFields = prepareSelectedFormWizardFields(
      fields,
      ['nomisId'], // Only prepare the nomisId field for this page
      formValues || sessionData,
      validationErrors
    )

    res.render('pages/search/search', {
      fields: preparedFields,
      nomisId: formValues?.nomisId || sessionData?.nomisId || '',
      validationErrors,
      errorlist: errorlist || [],
      errorMessage,
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    // Validation is handled by middleware, but we need to do business validation
    const nomisId = sanitizeString(String(req.body.nomisId))
    const { prisonerService } = req.services
    const { username } = req.user

    try {
      // Try to get prisoner details
      const prisoner = await prisonerService.getPrisonerDetails(nomisId, username)

      // Save to session
      // TODO: Remove cast once SessionManager is refactored to use Express sessions
      // For now, we need to handle the case where sessionModel doesn't exist
      const formWizardReq = req as unknown as FormWizard.Request
      if (formWizardReq.sessionModel) {
        SessionManager.updateRecallData(formWizardReq, { nomisId })
      } else if (req.session) {
        // Store in regular Express session as fallback
        // This will be the permanent solution once SessionManager is refactored
        // TODO: Remove any cast once SessionManager migration is complete
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(req.session as any).nomisId = nomisId
      }

      // Store prisoner in locals for potential use
      res.locals.prisoner = prisoner
      res.locals.nomisId = nomisId

      // Redirect to person page
      res.redirect(`/person/${nomisId}`)
    } catch (error) {
      logger.error('Error fetching prisoner details', error)

      // Create validation error and store in session
      const validationError = createFieldError('nomisId', 'No prisoner details found for this NOMIS ID')
      ValidationService.setSessionErrors(req, validationError)

      // Redirect back to search page
      res.redirect('/search/nomisId')
    }
  }
}
