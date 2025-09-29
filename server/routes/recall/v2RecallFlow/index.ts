import express, { Router } from 'express'
import asyncMiddleware from '../../../middleware/asyncMiddleware'
import { validate, populateValidationData } from '../../../middleware/validationMiddleware'
import loadPrisoner from '../../../middleware/loadPrisoner'
import CheckPossibleControllerV2 from './checkPossibleControllerV2'
import RevocationDateControllerV2 from './revocationDateControllerV2'
import NotPossibleControllerV2 from './notPossibleControllerV2'
import ReturnToCustodyDateControllerV2 from './returnToCustodyDateControllerV2'
import ConfirmCancelControllerV2 from './confirmCancelControllerV2'
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
  router.get(
    '/not-possible',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(NotPossibleControllerV2.get),
  )

  // Revocation date page with validation
  router.get(
    '/revocation-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RevocationDateControllerV2.get),
  )
  router.post(
    '/revocation-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('revocationDate'),
    asyncMiddleware(RevocationDateControllerV2.post),
  )

  // Return to custody date page with validation
  router.get(
    '/rtc-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ReturnToCustodyDateControllerV2.get),
  )
  router.post(
    '/rtc-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('returnToCustody'),
    asyncMiddleware(ReturnToCustodyDateControllerV2.post),
  )

  // Confirm cancel page with validation
  router.get(
    '/confirm-cancel',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ConfirmCancelControllerV2.get),
  )
  router.post(
    '/confirm-cancel',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('confirmCancel'),
    asyncMiddleware(ConfirmCancelControllerV2.post),
  )

  // Placeholder routes for pages not yet migrated to V2
  router.get('/check-sentences', asyncMiddleware(underConstructionController))
  router.get('/manual-recall-intercept', asyncMiddleware(underConstructionController))
  router.get('/no-sentences-interrupt', asyncMiddleware(underConstructionController))
  router.get('/conflicting-adjustments-interrupt', asyncMiddleware(underConstructionController))

  // TODO: As more controllers are migrated to V2, replace underConstructionController with the actual V2 controller

  return router
}
