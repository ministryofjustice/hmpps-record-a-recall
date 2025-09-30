import express, { Router } from 'express'
import asyncMiddleware from '../../../middleware/asyncMiddleware'
import { validate, populateValidationData } from '../../../middleware/validationMiddleware'
import loadPrisoner from '../../../middleware/loadPrisoner'
import CheckPossibleControllerV2 from './checkPossibleControllerV2'
import RevocationDateControllerV2 from './revocationDateControllerV2'
import NotPossibleControllerV2 from './notPossibleControllerV2'
import ReturnToCustodyDateControllerV2 from './returnToCustodyDateControllerV2'
import ConfirmCancelControllerV2 from './confirmCancelControllerV2'
import ConflictingAdjustmentsInterruptControllerV2 from './conflictingAdjustmentsInterruptControllerV2'
import NoSentencesInterruptControllerV2 from './noSentencesInterruptControllerV2'
import ManualRecallInterceptControllerV2 from './manualRecallInterceptControllerV2'
import CheckSentencesControllerV2 from './checkSentencesControllerV2'
import SelectCourtCaseControllerV2 from './selectCourtCaseControllerV2'
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

  // Interrupt pages (GET only, no POST needed)
  router.get(
    '/conflicting-adjustments-interrupt',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(ConflictingAdjustmentsInterruptControllerV2.get),
  )

  router.get(
    '/no-sentences-interrupt',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(NoSentencesInterruptControllerV2.get),
  )

  // Manual recall intercept page (no validation needed as it's just a continue button)
  router.get(
    '/manual-recall-intercept',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ManualRecallInterceptControllerV2.get),
  )
  router.post(
    '/manual-recall-intercept',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(ManualRecallInterceptControllerV2.post),
  )

  // Select court case page (manual recall flow)
  router.get(
    '/select-court-case',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(SelectCourtCaseControllerV2.get),
  )
  router.post(
    '/select-court-case',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('selectCourtCase'),
    asyncMiddleware(SelectCourtCaseControllerV2.post),
  )

  // Check sentences page (no validation needed as it's just a confirmation page)
  router.get(
    '/check-sentences',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(CheckSentencesControllerV2.get),
  )
  router.post(
    '/check-sentences',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(CheckSentencesControllerV2.post),
  )

  // Placeholder routes for pages not yet migrated to V2
  router.get('/recall-type', asyncMiddleware(underConstructionController))
  router.get('/no-cases-selected', asyncMiddleware(underConstructionController))
  router.get('/update-sentence-types-summary', asyncMiddleware(underConstructionController))

  // TODO: As more controllers are migrated to V2, replace underConstructionController with the actual V2 controller

  return router
}
