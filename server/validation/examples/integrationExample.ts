/**
 * Complete Integration Example - Person Search Migration
 *
 * This example shows the complete migration pattern from FormWizard to Zod validation
 * based on the actual PersonSearchController migration.
 *
 * IMPORTANT: Follow this pattern for all controller migrations to ensure consistency.
 */

import { Request, Response, NextFunction, Router } from 'express'
import { validate, populateValidationData } from '../../middleware/validationMiddleware'
import { sessionModelAdapter } from '../../middleware/sessionModelAdapter'
import { prepareSelectedFormWizardFields } from '../../utils/formWizardFieldsHelper'
import SessionManager from '../../services/sessionManager'
import ValidationService from '../../validation/service'
import { createFieldError } from '../../validation/utils/errorFormatting'
import { sanitizeString } from '../../utils/utils'
import logger from '../../../logger'

// Import the schema and field configurations
import { personSearchSchema } from '../schemas/search/personSearchSchema'
import fields from '../../routes/search/fields'

/**
 * STEP 1: Create Your Schema
 * Define validation rules using Zod
 * Place in /server/validation/schemas/[feature]/[name]Schema.ts
 */
// Example schema (already exists in personSearchSchema.ts):
// import { z } from 'zod'
// import { nomisIdSchema } from '../../utils/commonValidators'
//
// export const personSearchSchema = z.object({
//   nomisId: nomisIdSchema,
// })
//
// export type PersonSearchData = z.infer<typeof personSearchSchema>
//
// export const personSearchFieldLabels = {
//   nomisId: 'NOMIS ID',
// }

/**
 * STEP 2: Register Your Schema
 * Add to /server/validation/schemas/index.ts
 */
// In registerAllSchemas():
// ValidationService.registerSchema('personSearch', personSearchSchema)
// 
// In registerFieldLabels():
// ValidationService.registerFieldLabels('personSearch', personSearchFieldLabels)

/**
 * STEP 3: Refactor the existing Controller
 * Convert from FormWizard class to Express handlers
 */
export class PersonSearchController {
  /**
   * Optional: Add middleware for route-specific logic
   */
  static checkForRedirect(_req: Request, res: Response, next: NextFunction): void {
    // Example: Check environment and redirect if needed
    const isLocalDevelopment = true // Your logic here

    if (!isLocalDevelopment) {
      res.redirect('/external-url')
      return
    }

    next()
  }

  /**
   * GET handler - displays the form
   * Key patterns:
   * - Use populateValidationData middleware to get errors from session
   * - Use SessionManager with 'as any' cast (temporary during migration)
   * - Use prepareSelectedFormWizardFields for template compatibility
   */
  static async get(req: Request, res: Response): Promise<void> {
    // 1. Get flash messages for any non-validation errors
    const errorMessage = req.flash('errorMessage')

    // 2. Get validation data from middleware
    // populateValidationData middleware adds these to res.locals
    const { validationErrors, formValues, errorlist } = res.locals

    // 3. Get existing session data
    // Note: sessionModelAdapter middleware must be applied to routes
    // TODO: Remove 'as any' once SessionManager is refactored
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionData = SessionManager.getAllSessionData(req as any)

    // 4. Prepare fields for FormWizard-style templates
    // This bridges old templates with new validation
    const preparedFields = prepareSelectedFormWizardFields(
      fields,
      ['nomisId'], // Specify which fields to prepare for this page
      formValues || sessionData, // Use form values if available, otherwise session data
      validationErrors // Pass validation errors to mark fields as invalid
    )

    // 5. Render with all necessary data
    res.render('pages/search/search', {
      fields: preparedFields, // For FormWizard template compatibility
      nomisId: formValues?.nomisId || sessionData?.nomisId || '', // Individual field value
      validationErrors, // Error object for field-level errors
      errorlist: errorlist || [], // Error list for summary display
      errorMessage, // Flash messages for non-validation errors
    })
  }

  /**
   * POST handler - processes form submission
   * Key patterns:
   * - Validation handled by middleware
   * - Business logic/API calls in controller
   * - Use ValidationService for custom errors
   */
  static async post(req: Request, res: Response): Promise<void> {
    // 1. Extract and sanitize input
    // Always sanitize user input for security
    const nomisId = sanitizeString(String(req.body.nomisId))
    
    // 2. Get services from request (injected by middleware)
    const { prisonerService } = req.services
    const { username } = req.user

    try {
      // 3. Business logic (API calls, database queries, etc.)
      const prisoner = await prisonerService.getPrisonerDetails(nomisId, username)

      // 4. Save to session using SessionManager
      // sessionModel is added by sessionModelAdapter middleware
      // TODO: Remove 'as any' once SessionManager types are updated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SessionManager.updateRecallData(req as any, { nomisId })

      // 5. Store data for potential use by next handler
      res.locals.prisoner = prisoner
      res.locals.nomisId = nomisId

      // 6. Redirect to next step in the flow
      res.redirect(`/person/${nomisId}`)
    } catch (error) {
      logger.error('Error fetching prisoner details', error)

      // 7. Handle business validation errors
      // This is for validation that requires external checks
      const validationError = createFieldError('nomisId', 'No prisoner details found for this NOMIS ID')
      
      // 8. Store error in session for display on redirect
      ValidationService.setSessionErrors(req, validationError)

      // 9. Redirect back to show the error
      res.redirect('/search/nomisId')
    }
  }
}

/**
 * STEP 4: Set Up Routes
 * Configure Express routes with proper middleware using a setup function
 * This pattern provides better modularity, testability, and clarity
 */
export function setupPersonSearchRoutes(router: Router): void {
  // CRITICAL: Add sessionModelAdapter first
  // This bridges FormWizard sessionModel with Express sessions
  // TODO: Remove once SessionManager is refactored to use Express sessions directly
  router.use(sessionModelAdapter)

  // Optional: Apply any route-specific middleware
  router.use(PersonSearchController.checkForRedirect)

  // Root route redirect (if needed)
  router.get('/', (_req, res) => {
    res.redirect('/search/nomisId')
  })

  // GET route with validation error display
  router.get(
    '/nomisId',
    populateValidationData, // Populates errors from session
    PersonSearchController.get
  )

  // POST route with validation
  router.post(
    '/nomisId',
    validate('personSearch', {
      mergeToSession: true, // Auto-merge validated data to session
      redirectOnError: req => req.originalUrl, // Redirect back on validation error
      businessRules: async (_data, _req) => {
        // Optional: Add business rules that can't be in schema
        // Business validation happens in the controller for this example
        // Return null if valid, or error object if invalid
        return null
      }
    }),
    PersonSearchController.post
  )
}

/**
 * ACTUAL ROUTE FILE STRUCTURE
 * File: /server/routes/search/index.ts
 */
// import express, { Router } from 'express'
// import { validate, populateValidationData } from '../../middleware/validationMiddleware'
// import PersonSearchController from '../../controllers/search/personSearchController'
// import { sessionModelAdapter } from '../../middleware/sessionModelAdapter'
//
// function setupPersonSearchRoutes(router: Router): void {
//   // ... route setup code as shown above ...
// }
//
// // Create router and apply routes
// const router = express.Router({ mergeParams: true })
// setupPersonSearchRoutes(router)
//
// export default router
// export { setupPersonSearchRoutes } // Export for testing

/**
 * MIGRATION PATTERNS SUMMARY
 *
 * 1. SCHEMA VALIDATION vs BUSINESS VALIDATION
 *    - Schema: Format, required fields, data types (in Zod schema)
 *    - Business: API checks, database lookups (in controller)
 *
 * 2. SESSION MANAGEMENT
 *    - Use sessionModelAdapter middleware (temporary)
 *    - Cast req as any when calling SessionManager (temporary)
 *    - SessionManager handles recall data persistence
 *
 * 3. ERROR HANDLING
 *    - Validation errors: Handled by middleware, shown via populateValidationData
 *    - Business errors: Use ValidationService.setSessionErrors()
 *    - Flash messages: For non-validation errors
 *
 * 4. TEMPLATE COMPATIBILITY
 *    - Use prepareSelectedFormWizardFields for old templates
 *    - Pass both 'fields' (for FormWizard) and individual values
 *    - Eventually migrate templates to use direct GOV.UK macros
 *
 * 5. MIDDLEWARE ORDER (CRITICAL!)
 *    1. sessionModelAdapter (first!)
 *    2. populateValidationData (GET routes)
 *    3. validate() (POST routes)
 *    4. Controller handler
 */

/**
 * COMMON PITFALLS TO AVOID
 *
 * 1. ❌ Forgetting sessionModelAdapter = SessionManager won't work
 * 2. ❌ Not registering schema = "No schema registered" error
 * 3. ❌ Missing populateValidationData = Errors won't display
 * 4. ❌ Not using prepareSelectedFormWizardFields = Template won't render fields
 * 5. ❌ Forgetting 'as any' cast = TypeScript errors with SessionManager
 * 6. ❌ Not sanitizing inputs = Security vulnerabilities
 * 7. ❌ Mixing validation and business logic = Confusing error handling
 * 8. ❌ Wrong middleware order = Session data not available
 * 9. ❌ Not handling async errors = Unhandled promise rejections
 * 10. ❌ Using req.session directly = Should use SessionManager
 */

/**
 * TESTING YOUR MIGRATION
 *
 * 1. Schema validation:
 *    - Submit empty form → Should show required field error
 *    - Submit invalid format → Should show format error
 *    - Error should appear in summary and next to field
 *
 * 2. Business validation:
 *    - Submit valid but non-existent ID → Should show business error
 *    - Error message should be user-friendly
 *
 * 3. Session persistence:
 *    - Submit valid form → Data should persist to next step
 *    - Navigate back → Should show previously entered data
 *    - Refresh page → Data should still be there
 *
 * 4. Template rendering:
 *    - Initial load → Should show empty form
 *    - After error → Should show form with error messages and retained values
 *    - After back navigation → Should show saved values
 *
 * 5. Run these commands:
 *    npm run lint         # Check code style
 *    npm run typecheck    # Check TypeScript types
 *    npm test            # Run unit tests
 *    npm run int-test    # Run Cypress tests
 */

/**
 * COMPLETE WORKING EXAMPLE
 * 
 * Here's a minimal but complete example of migrating a simple form:
 */

// 1. Schema file: /server/validation/schemas/example/userDetailsSchema.ts
/*
import { z } from 'zod'

export const userDetailsSchema = z.object({
  firstName: z.string().min(1, 'Enter a first name'),
  lastName: z.string().min(1, 'Enter a last name'),
  email: z.string().email('Enter a valid email address'),
})

export type UserDetailsData = z.infer<typeof userDetailsSchema>

export const userDetailsFieldLabels = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email address',
}
*/

// 2. Register in /server/validation/schemas/index.ts
/*
import { userDetailsSchema, userDetailsFieldLabels } from './example/userDetailsSchema'

export function registerAllSchemas(): void {
  // ... existing registrations
  ValidationService.registerSchema('userDetails', userDetailsSchema)
}

export function registerFieldLabels(): void {
  // ... existing registrations
  ValidationService.registerFieldLabels('userDetails', userDetailsFieldLabels)
}
*/

// 3. Controller: /server/controllers/example/userDetailsController.ts
/*
export class UserDetailsController {
  static async get(req: Request, res: Response): Promise<void> {
    const { validationErrors, formValues, errorlist } = res.locals
    const sessionData = SessionManager.getAllSessionData(req as any)
    
    const preparedFields = prepareSelectedFormWizardFields(
      fields,
      ['firstName', 'lastName', 'email'],
      formValues || sessionData,
      validationErrors
    )

    res.render('pages/example/user-details', {
      fields: preparedFields,
      validationErrors,
      errorlist: errorlist || [],
    })
  }

  static async post(req: Request, res: Response): Promise<void> {
    const { firstName, lastName, email } = req.body
    
    // Save to session
    SessionManager.updateRecallData(req as any, {
      firstName: sanitizeString(firstName),
      lastName: sanitizeString(lastName),
      email: sanitizeString(email),
    })

    res.redirect('/example/confirmation')
  }
}
*/

// 4. Routes: /server/routes/example/index.ts
/*
import express from 'express'
import { validate, populateValidationData } from '../../middleware/validationMiddleware'
import { sessionModelAdapter } from '../../middleware/sessionModelAdapter'
import { UserDetailsController } from '../../controllers/example/userDetailsController'

const router = express.Router()

router.use(sessionModelAdapter)

router.get('/user-details', populateValidationData, UserDetailsController.get)
router.post('/user-details', validate('userDetails'), UserDetailsController.post)

export default router
*/

/**
 * MIGRATION TIMELINE
 * 
 * Phase 1 (Current): Migrate controllers with sessionModelAdapter
 * Phase 2: Refactor SessionManager to use Express sessions directly
 * Phase 3: Remove sessionModelAdapter and 'as any' casts
 * Phase 4: Migrate templates to use GOV.UK macros directly
 * Phase 5: Remove FormWizard field configurations
 */