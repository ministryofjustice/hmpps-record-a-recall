import express, { Router } from 'express'
import asyncMiddleware from '../../../middleware/asyncMiddleware'
import { validate, populateValidationData } from '../../../middleware/validationMiddleware'
import loadPrisoner from '../../../middleware/loadPrisoner'
import populateRecallId from '../../../middleware/populateRecallId'
import PopulateStoredRecallController from './populateStoredRecallController'
import EditSummaryController from './editSummaryController'
import RecallRecordedController from '../recallRecordedController'

// Import existing V2 controllers that will be reused
import RevocationDateController from '../revocationDateController'
import ReturnToCustodyDateController from '../returnToCustodyDateController'
import CheckSentencesController from '../checkSentencesController'
import RecallTypeController from '../recallTypeController'
import ConfirmCancelController from '../confirmCancelController'
import SelectCourtCaseController from '../selectCourtCaseController'
import ManualRecallInterceptController from '../manualRecallInterceptController'
import NoSentencesInterruptController from '../noSentencesInterruptController'
import ConflictingAdjustmentsInterruptController from '../conflictingAdjustmentsInterruptController'

export default function editRoutes(): Router {
  const router = express.Router({ mergeParams: true })

  // Entry point - populate stored recall data
  router.get(
    '/',
    populateRecallId(),
    loadPrisoner(null, { checkSession: false, updateSession: true }),
    asyncMiddleware(PopulateStoredRecallController.get),
  )

  // Edit summary page
  router.get(
    '/edit-summary',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(EditSummaryController.get),
  )
  router.post(
    '/edit-summary',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(EditSummaryController.post),
  )

  // Reuse existing V2 controllers for individual steps
  // They will detect edit mode from the URL pattern

  // Revocation date
  router.get(
    '/revocation-date',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RevocationDateController.get),
  )
  router.post(
    '/revocation-date',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('revocationDate'),
    asyncMiddleware(RevocationDateController.post),
  )

  // Return to custody date
  router.get(
    '/rtc-date',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ReturnToCustodyDateController.get),
  )
  router.post(
    '/rtc-date',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('returnToCustody'),
    asyncMiddleware(ReturnToCustodyDateController.post),
  )

  // Check sentences
  router.get(
    '/check-sentences',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(CheckSentencesController.get),
  )
  router.post(
    '/check-sentences',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(CheckSentencesController.post),
  )

  // Select court cases (for manual flow)
  router.get(
    '/select-court-cases',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(SelectCourtCaseController.get),
  )
  router.post(
    '/select-court-cases',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('selectCourtCase'),
    asyncMiddleware(SelectCourtCaseController.post),
  )

  // Recall type
  router.get(
    '/recall-type',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RecallTypeController.get),
  )
  router.post(
    '/recall-type',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('recallType'),
    asyncMiddleware(RecallTypeController.post),
  )

  // Manual recall intercept
  router.get(
    '/manual-recall-intercept',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ManualRecallInterceptController.get),
  )
  router.post(
    '/manual-recall-intercept',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(ManualRecallInterceptController.post),
  )

  // Interrupt pages (GET only)
  router.get(
    '/no-sentences-interrupt',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(NoSentencesInterruptController.get),
  )

  router.get(
    '/conflicting-adjustments-interrupt',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(ConflictingAdjustmentsInterruptController.get),
  )

  // Confirm cancel
  router.get(
    '/confirm-cancel',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ConfirmCancelController.get),
  )
  router.post(
    '/confirm-cancel',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('confirmCancel'),
    asyncMiddleware(ConfirmCancelController.post),
  )

  // Success page
  router.get(
    '/recall-updated',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: false }),
    asyncMiddleware(RecallRecordedController.get),
  )

  return router
}
