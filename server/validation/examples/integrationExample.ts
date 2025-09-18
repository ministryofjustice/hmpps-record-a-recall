/**
 * Example of integrating Zod validation with Express controllers
 * This shows how to migrate from FormWizard to the new validation system
 */

import { Request, Response, NextFunction, Router } from 'express'
import { validate, populateValidationData } from '../../middleware/validationMiddleware'
import { revocationDateSchema } from '../schemas/recall/revocationDateSchema'
import { registerAllSchemas } from '../schemas'
// Mock SessionManager for example - replace with actual import when available
const SessionManager = {
  getRecallData: (req: Request) => (req.session as any)?.recallData || {},
  updateRecallData: (req: Request, data: any) => {
    const session = req.session as any
    session.recallData = { ...session.recallData, ...data }
  },
}

// Initialize schemas (should be done in app startup)
registerAllSchemas()

/**
 * Example controller using new validation
 */
class RevocationDateControllerNew {
  /**
   * GET handler - displays the form with any validation errors
   */
  static async get(req: Request, res: Response): Promise<void> {
    // Get recall data from session
    const recallData = SessionManager.getRecallData(req)

    // populateValidationData middleware adds errors to res.locals
    const { validationErrors, formValues } = res.locals

    res.render('pages/recall/revocation-date', {
      revocationDate: formValues?.revocationDate || recallData?.revocationDate,
      validationErrors,
      errorlist: res.locals.errorlist || [],
    })
  }

  /**
   * POST handler - validates and processes form submission
   */
  static async post(req: Request, res: Response): Promise<void> {
    // Validation is handled by middleware
    // If we reach here, validation passed
    const { validatedData } = res.locals

    // Data is automatically merged into session by middleware
    // Navigate to next step
    res.redirect('/person/A1234BC/recall/rtc-date')
  }
}

/**
 * Example route setup
 */
export function setupRevocationDateRoute(router: Router): void {
  // GET route with error display middleware
  router.get(
    '/person/:nomisId/recall/revocation-date',
    populateValidationData, // Populates errors from session
    RevocationDateControllerNew.get,
  )

  // POST route with validation middleware
  router.post(
    '/person/:nomisId/recall/revocation-date',
    validate(revocationDateSchema, {
      mergeToSession: true, // Automatically merge validated data to session
      redirectOnError: req => req.originalUrl, // Redirect back to same page on error
    }),
    RevocationDateControllerNew.post,
  )
}

/**
 * Alternative: Using registered schema name instead of importing schema
 */
export function setupRevocationDateRouteAlt(router: Router): void {
  router.get('/person/:nomisId/recall/revocation-date', populateValidationData, RevocationDateControllerNew.get)

  router.post(
    '/person/:nomisId/recall/revocation-date',
    validate('revocationDate'), // Use registered schema name
    RevocationDateControllerNew.post,
  )
}

/**
 * Example with conditional validation
 */
export function setupReturnToCustodyRoute(router: Router): void {
  router.post(
    '/person/:nomisId/recall/rtc-date',
    validate('returnToCustody', {
      businessRules: async (data, req) => {
        // Example business rule: RTC date must be after revocation date
        const recallData = SessionManager.getRecallData(req)
        if (recallData?.revocationDate && data.returnToCustodyDate) {
          const revDate = new Date(recallData.revocationDate)
          const rtcDate = new Date(data.returnToCustodyDate)

          if (rtcDate < revDate) {
            return {
              errors: {
                returnToCustodyDate: {
                  text: 'Return to custody date must be equal to or after the revocation date',
                },
              },
              errorSummary: [
                {
                  text: 'Return to custody date must be equal to or after the revocation date',
                  href: '#returnToCustodyDate',
                },
              ],
            }
          }
        }
        return null
      },
    }),
    async (req: Request, res: Response) => {
      res.redirect('/person/A1234BC/recall/check-sentences')
    },
  )
}

/**
 * Example of migrating a complete form flow
 */
export function migrateRecallFlow(router: Router): void {
  // Step 1: Revocation Date
  router.get('/recall/revocation-date', populateValidationData, (req, res) => {
    res.render('recall/revocation-date', res.locals)
  })

  router.post('/recall/revocation-date', validate('revocationDate'), (req, res) => res.redirect('/recall/rtc-date'))

  // Step 2: Return to Custody
  router.get('/recall/rtc-date', populateValidationData, (req, res) => {
    res.render('recall/rtc-date', res.locals)
  })

  router.post('/recall/rtc-date', validate('returnToCustody'), (req, res) => res.redirect('/recall/recall-type'))

  // Step 3: Recall Type
  router.get('/recall/recall-type', populateValidationData, (req, res) => {
    res.render('recall/recall-type', res.locals)
  })

  router.post('/recall/recall-type', validate('recallType'), (req, res) => res.redirect('/recall/check-your-answers'))
}
