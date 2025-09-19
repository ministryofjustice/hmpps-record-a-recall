import { Request, Response, NextFunction } from 'express'
import { sanitizeString } from '../../utils/utils'
import logger from '../../../logger'
import config from '../../config'
import SessionManager from '../../services/sessionManager'
import ValidationService from '../../validation/service'
import { createFieldError } from '../../validation/utils/errorFormatting'
import { prepareSelectedFormWizardFields } from '../../utils/formWizardFieldsHelper'
import fields from '../../routes/search/fields'

export default class PersonSearchController {
  static checkForRedirect(_req: Request, res: Response, next: NextFunction): void {
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
    // sessionModel is added by sessionModelAdapter middleware
    // TODO: Remove 'as any' once SessionManager types are updated to accept Express Request with sessionModel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionData = SessionManager.getAllSessionData(req as any)

    // Prepare fields for template rendering using the helper
    // This bridges FormWizard field configs with our new validation approach
    const preparedFields = prepareSelectedFormWizardFields(
      fields,
      ['nomisId'], // Only prepare the nomisId field for this page
      formValues || sessionData,
      validationErrors,
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

      // Save to session using SessionManager
      // sessionModel is added by sessionModelAdapter middleware
      // TODO: Remove 'as any' once SessionManager types are updated to accept Express Request with sessionModel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SessionManager.updateRecallData(req as any, { nomisId })

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
