# Complete Integration Guide - FormWizard to Zod Migration

This guide shows the complete migration pattern from FormWizard to Zod validation, based on the actual PersonSearchController migration.

**IMPORTANT:** Follow this pattern for all controller migrations to ensure consistency.

## Table of Contents
1. [BaseController Pattern](#basecontroller-pattern)
2. [Migration Steps](#migration-steps)
3. [Complete Example](#complete-example)
4. [Migration Patterns Summary](#migration-patterns-summary)
5. [Common Pitfalls](#common-pitfalls)
6. [Testing Your Migration](#testing-your-migration)
7. [Benefits of BaseController](#benefits-of-basecontroller)

## BaseController Pattern

All migrated controllers should extend BaseController which provides:
- Session management with temporary FormWizard compatibility
- Validation data extraction from res.locals
- Field preparation for FormWizard templates
- Common error handling patterns

This encapsulates temporary workarounds during migration and ensures consistency.

BaseController is located at: `/server/controllers/base/BaseController.ts`

### BaseController Methods

```typescript
class BaseController {
  // Gets session data with 'as any' cast handled internally
  static getSessionData(req: Request): any
  
  // Updates session data
  static updateSessionData(req: Request, data: any): void
  
  // Common rendering helper
  static renderForm(
    req: Request, 
    res: Response, 
    template: string,
    fieldConfig: any,
    fieldNames: string[],
    additionalData?: any
  ): void
  
  // Business error handling
  static setBusinessError(
    req: Request,
    res: Response,
    fieldName: string,
    errorMessage: string,
    redirectUrl: string
  ): void
}
```

## Migration Steps

### STEP 1: Create Your Schema

Define validation rules using Zod. Place in `/server/validation/schemas/[feature]/[name]Schema.ts`

```typescript
// server/validation/schemas/search/personSearchSchema.ts
import { z } from 'zod'
import { nomisIdSchema } from '../../utils/commonValidators'

export const personSearchSchema = z.object({
  nomisId: nomisIdSchema,
})

export type PersonSearchData = z.infer<typeof personSearchSchema>

export const personSearchFieldLabels = {
  nomisId: 'NOMIS ID',
}
```

### STEP 2: Register Your Schema

Add to `/server/validation/schemas/index.ts`

```typescript
// In registerAllSchemas():
ValidationService.registerSchema('personSearch', personSearchSchema)

// In registerFieldLabels():
ValidationService.registerFieldLabels('personSearch', personSearchFieldLabels)
```

### STEP 3: Refactor the Controller

Convert from FormWizard class to Express handlers extending BaseController.

```typescript
// server/controllers/search/personSearchController.ts
import { Request, Response, NextFunction } from 'express'
import BaseController from '../base/BaseController'
import { sanitizeString } from '../../utils/utils'
import logger from '../../../logger'
import fields from '../../routes/search/fields'
import config from '../../config'

export class PersonSearchController extends BaseController {
  /**
   * Optional: Add middleware for route-specific logic
   */
  static checkForRedirect(_req: Request, res: Response, next: NextFunction): void {
    const isLocalDevelopment = config.domain.includes('localhost') || config.domain.includes('127.0.0.1')

    if (!isLocalDevelopment) {
      res.redirect(config.applications.digitalPrisonServices.url)
      return
    }

    next()
  }

  /**
   * GET handler - displays the form
   * Using BaseController's helper methods for cleaner code
   */
  static async get(req: Request, res: Response): Promise<void> {
    // BaseController.getSessionData handles the 'as any' cast internally
    const sessionData = this.getSessionData(req)

    // BaseController.renderForm handles all the common rendering logic:
    // - Gets validation data from res.locals
    // - Prepares fields for template
    // - Adds flash messages
    // - Renders the template
    this.renderForm(
      req,
      res,
      'pages/search/search',
      fields,
      ['nomisId'],
      {
        // Pass any additional template data
        nomisId: res.locals.formValues?.nomisId || sessionData?.nomisId || ''
      }
    )
  }

  /**
   * POST handler - processes form submission
   * Using BaseController's helper methods for session and error handling
   */
  static async post(req: Request, res: Response): Promise<void> {
    // 1. Extract and sanitize input
    const nomisId = sanitizeString(String(req.body.nomisId))
    const { prisonerService } = req.services
    const { username } = req.user

    try {
      // 2. Business logic (API calls, etc.)
      const prisoner = await prisonerService.getPrisonerDetails(nomisId, username)

      // 3. Use BaseController's updateSessionData (handles 'as any' cast)
      this.updateSessionData(req, { nomisId })

      // 4. Store data for next step
      res.locals.prisoner = prisoner
      res.locals.nomisId = nomisId

      // 5. Redirect to next step
      res.redirect(`/person/${nomisId}`)
    } catch (error) {
      logger.error('Error fetching prisoner details', error)

      // 6. Use BaseController's setBusinessError helper
      // This handles error creation, session storage, and redirect
      this.setBusinessError(
        req,
        res,
        'nomisId',
        'No prisoner details found for this NOMIS ID',
        '/search/nomisId'
      )
    }
  }
}
```

### STEP 4: Set Up Routes

Configure Express routes with proper middleware using a setup function.

```typescript
// server/routes/search/index.ts
import express, { Router } from 'express'
import { validate, populateValidationData } from '../../middleware/validationMiddleware'
import PersonSearchController from '../../controllers/search/personSearchController'
import { sessionModelAdapter } from '../../middleware/sessionModelAdapter'

function setupPersonSearchRoutes(router: Router): void {
  // CRITICAL: Add sessionModelAdapter first
  // This bridges FormWizard sessionModel with Express sessions
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
    PersonSearchController.get,
  )

  // POST route with validation
  router.post(
    '/nomisId',
    validate('personSearch', {
      mergeToSession: true, // Auto-merge validated data to session
      redirectOnError: req => req.originalUrl, // Redirect back on validation error
      businessRules: async (_data, _req) => {
        // Optional: Add business rules that can't be in schema
        // Return null if valid, or error object if invalid
        return null
      },
    }),
    PersonSearchController.post,
  )
}

// Create router and apply routes
const router = express.Router({ mergeParams: true })
setupPersonSearchRoutes(router)

export default router
export { setupPersonSearchRoutes } // Export for testing
```

## Complete Example

Here's a minimal but complete example of migrating a simple form:

### 1. Schema File
```typescript
// server/validation/schemas/example/userDetailsSchema.ts
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
```

### 2. Register Schema
```typescript
// server/validation/schemas/index.ts
import { userDetailsSchema, userDetailsFieldLabels } from './example/userDetailsSchema'

export function registerAllSchemas(): void {
  // ... existing registrations
  ValidationService.registerSchema('userDetails', userDetailsSchema)
}

export function registerFieldLabels(): void {
  // ... existing registrations
  ValidationService.registerFieldLabels('userDetails', userDetailsFieldLabels)
}
```

### 3. Controller
```typescript
// server/controllers/example/userDetailsController.ts
import BaseController from '../base/BaseController'
import { sanitizeString } from '../../utils/utils'
import fields from '../../routes/example/fields'

export class UserDetailsController extends BaseController {
  static async get(req: Request, res: Response): Promise<void> {
    this.renderForm(
      req,
      res,
      'pages/example/user-details',
      fields,
      ['firstName', 'lastName', 'email'],
      {
        // Additional template data if needed
      }
    )
  }

  static async post(req: Request, res: Response): Promise<void> {
    const { firstName, lastName, email } = req.body
    
    // Save to session using BaseController method
    this.updateSessionData(req, {
      firstName: sanitizeString(firstName),
      lastName: sanitizeString(lastName),
      email: sanitizeString(email),
    })

    res.redirect('/example/confirmation')
  }
}
```

### 4. Routes
```typescript
// server/routes/example/index.ts
import express from 'express'
import { validate, populateValidationData } from '../../middleware/validationMiddleware'
import { sessionModelAdapter } from '../../middleware/sessionModelAdapter'
import { UserDetailsController } from '../../controllers/example/userDetailsController'

const router = express.Router()

router.use(sessionModelAdapter)

router.get('/user-details', populateValidationData, UserDetailsController.get)
router.post('/user-details', validate('userDetails'), UserDetailsController.post)

export default router
```

## Migration Patterns Summary

### 0. BASE CONTROLLER PATTERN (NEW!)
- Always extend BaseController for migrated controllers
- Use helper methods instead of direct SessionManager calls
- Encapsulates temporary workarounds in one place
- Provides consistency across all migrations

### 1. SCHEMA VALIDATION vs BUSINESS VALIDATION
- **Schema**: Format, required fields, data types (in Zod schema)
- **Business**: API checks, database lookups (in controller)

### 2. SESSION MANAGEMENT
- Use BaseController methods (getSessionData, updateSessionData)
- BaseController handles 'as any' casts internally
- SessionManager abstraction managed by BaseController

### 3. ERROR HANDLING
- **Validation errors**: Handled by middleware, shown via populateValidationData
- **Business errors**: Use BaseController.setBusinessError()
- **Flash messages**: For non-validation errors

### 4. TEMPLATE COMPATIBILITY
- Use BaseController.renderForm() for common rendering patterns
- Automatically handles field preparation and error display
- Eventually migrate templates to use direct GOV.UK macros

### 5. MIDDLEWARE ORDER (CRITICAL!)
1. sessionModelAdapter (first!)
2. populateValidationData (GET routes)
3. validate() (POST routes)
4. Controller handler

## Common Pitfalls

1. ❌ **Forgetting sessionModelAdapter** = SessionManager won't work
2. ❌ **Not registering schema** = "No schema registered" error
3. ❌ **Missing populateValidationData** = Errors won't display
4. ❌ **Not using prepareSelectedFormWizardFields** = Template won't render fields
5. ❌ **Not extending BaseController** = Missing helper methods and consistency
6. ❌ **Using SessionManager directly** = Should use BaseController methods
7. ❌ **Not sanitizing inputs** = Security vulnerabilities
8. ❌ **Mixing validation and business logic** = Confusing error handling
9. ❌ **Wrong middleware order** = Session data not available
10. ❌ **Not handling async errors** = Unhandled promise rejections
11. ❌ **Using req.session directly** = Should use BaseController methods

## Testing Your Migration

### 1. Schema validation
- Submit empty form → Should show required field error
- Submit invalid format → Should show format error
- Error should appear in summary and next to field

### 2. Business validation
- Submit valid but non-existent ID → Should show business error
- Error message should be user-friendly

### 3. Session persistence
- Submit valid form → Data should persist to next step
- Navigate back → Should show previously entered data
- Refresh page → Data should still be there

### 4. Template rendering
- Initial load → Should show empty form
- After error → Should show form with error messages and retained values
- After back navigation → Should show saved values

### 5. Run these commands
```bash
npm run lint         # Check code style
npm run typecheck    # Check TypeScript types
npm test            # Run unit tests
npm run int-test    # Run Cypress tests
```

## Benefits of BaseController

1. **Consistency**: All migrated controllers follow the same pattern
2. **Encapsulation**: Temporary workarounds hidden in one place
3. **Maintainability**: When SessionManager is refactored, only update BaseController
4. **Cleaner Code**: Controllers focus on business logic, not boilerplate
5. **Type Safety**: 'as any' casts centralized and documented
6. **Helper Methods**: Common operations simplified

### Example of code reduction:
- Before BaseController: ~40 lines for GET handler
- After BaseController: ~10 lines for GET handler
- Before BaseController: ~30 lines for error handling in POST
- After BaseController: ~1 line using setBusinessError()

## Migration Timeline

- **Phase 1 (Current)**: Migrate controllers with BaseController pattern
- **Phase 2**: Refactor SessionManager to use Express sessions directly
- **Phase 3**: Update BaseController, remove sessionModelAdapter and 'as any' casts
- **Phase 4**: Migrate templates to use GOV.UK macros directly
- **Phase 5**: Remove FormWizard field configurations