import express, { Router } from 'express'
import asyncMiddleware from '../../../middleware/asyncMiddleware'
import { validate, populateValidationData } from '../../../middleware/validationMiddleware'
import loadPrisonerData from '../../../middleware/loadPrisonerData'
import CheckPossibleControllerV2 from './checkPossibleControllerV2'
import RevocationDateControllerV2 from './revocationDateControllerV2'
import NotPossibleControllerV2 from './notPossibleControllerV2'
import ReturnToCustodyDateControllerV2 from './returnToCustodyDateControllerV2'
import underConstructionController from './underConstructionController'
import { sessionModelAdapter } from '../../../middleware/sessionModelAdapter'

export default function routes(): Router {
  const router = express.Router()

  // Apply session model adapter for compatibility with SessionManager
  // TODO: Remove once SessionManager is refactored to use Express sessions directly
  router.use(sessionModelAdapter)

  // V2 recall flow route - /person/:nomisId/record-recall-v2
  // Entry point - check if recall is possible (matches original '/' route in steps.ts)
  router.get('/', asyncMiddleware(CheckPossibleControllerV2.get))

  // Not possible page (no form submission)
  router.get('/not-possible', asyncMiddleware(loadPrisonerData), asyncMiddleware(NotPossibleControllerV2.get))

  // Revocation date page with validation
  router.get(
    '/revocation-date',
    asyncMiddleware(loadPrisonerData),
    populateValidationData,
    asyncMiddleware(RevocationDateControllerV2.get),
  )
  router.post(
    '/revocation-date',
    asyncMiddleware(loadPrisonerData),
    validate('revocationDate'),
    asyncMiddleware(RevocationDateControllerV2.post),
  )

  // Return to custody date page with validation
  router.get(
    '/rtc-date',
    asyncMiddleware(loadPrisonerData),
    populateValidationData,
    asyncMiddleware(ReturnToCustodyDateControllerV2.get),
  )
  router.post(
    '/rtc-date',
    asyncMiddleware(loadPrisonerData),
    validate('returnToCustody'),
    asyncMiddleware(ReturnToCustodyDateControllerV2.post),
  )

  // Placeholder routes for pages not yet migrated to V2
  router.get('/check-sentences', asyncMiddleware(underConstructionController))
  router.get('/manual-recall-intercept', asyncMiddleware(underConstructionController))
  router.get('/no-sentences-interrupt', asyncMiddleware(underConstructionController))
  router.get('/conflicting-adjustments-interrupt', asyncMiddleware(underConstructionController))

  // TODO: As more controllers are migrated to V2, replace underConstructionController with the actual V2 controller

  return router
}
