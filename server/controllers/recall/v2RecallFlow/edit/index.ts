import express, { Router } from 'express'
import asyncMiddleware from '../../../../middleware/asyncMiddleware'
import { validate, populateValidationData } from '../../../../middleware/validationMiddleware'
import loadPrisoner from '../../../../middleware/loadPrisoner'
import populateRecallId from '../../../../middleware/populateRecallId'
import PopulateStoredRecallControllerV2 from './populateStoredRecallControllerV2'
import EditSummaryControllerV2 from './editSummaryControllerV2'
import RecallRecordedControllerV2 from '../recallRecordedControllerV2'

// Import existing V2 controllers that will be reused
import RevocationDateControllerV2 from '../revocationDateControllerV2'
import ReturnToCustodyDateControllerV2 from '../returnToCustodyDateControllerV2'
import CheckSentencesControllerV2 from '../checkSentencesControllerV2'
import RecallTypeControllerV2 from '../recallTypeControllerV2'
import ConfirmCancelControllerV2 from '../confirmCancelControllerV2'
import SelectCourtCaseControllerV2 from '../selectCourtCaseControllerV2'
import ManualRecallInterceptControllerV2 from '../manualRecallInterceptControllerV2'
import NoSentencesInterruptControllerV2 from '../noSentencesInterruptControllerV2'
import ConflictingAdjustmentsInterruptControllerV2 from '../conflictingAdjustmentsInterruptControllerV2'

export default function editRoutes(): Router {
  const router = express.Router({ mergeParams: true })

  // Entry point - populate stored recall data
  router.get(
    '/',
    populateRecallId(),
    loadPrisoner(null, { checkSession: false, updateSession: true }),
    asyncMiddleware(PopulateStoredRecallControllerV2.get),
  )

  // Edit summary page
  router.get(
    '/edit-summary',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(EditSummaryControllerV2.get),
  )
  router.post(
    '/edit-summary',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(EditSummaryControllerV2.post),
  )

  // Reuse existing V2 controllers for individual steps
  // They will detect edit mode from the URL pattern

  // Revocation date
  router.get(
    '/revocation-date',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RevocationDateControllerV2.get),
  )
  router.post(
    '/revocation-date',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('revocationDate'),
    asyncMiddleware(RevocationDateControllerV2.post),
  )

  // Return to custody date
  router.get(
    '/rtc-date',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ReturnToCustodyDateControllerV2.get),
  )
  router.post(
    '/rtc-date',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('returnToCustody'),
    asyncMiddleware(ReturnToCustodyDateControllerV2.post),
  )

  // Check sentences
  router.get(
    '/check-sentences',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(CheckSentencesControllerV2.get),
  )
  router.post(
    '/check-sentences',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(CheckSentencesControllerV2.post),
  )

  // Select court cases (for manual flow)
  router.get(
    '/select-court-cases',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(SelectCourtCaseControllerV2.get),
  )
  router.post(
    '/select-court-cases',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('selectCourtCase'),
    asyncMiddleware(SelectCourtCaseControllerV2.post),
  )

  // Recall type
  router.get(
    '/recall-type',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RecallTypeControllerV2.get),
  )
  router.post(
    '/recall-type',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('recallType'),
    asyncMiddleware(RecallTypeControllerV2.post),
  )

  // Manual recall intercept
  router.get(
    '/manual-recall-intercept',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ManualRecallInterceptControllerV2.get),
  )
  router.post(
    '/manual-recall-intercept',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(ManualRecallInterceptControllerV2.post),
  )

  // Interrupt pages (GET only)
  router.get(
    '/no-sentences-interrupt',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(NoSentencesInterruptControllerV2.get),
  )

  router.get(
    '/conflicting-adjustments-interrupt',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(ConflictingAdjustmentsInterruptControllerV2.get),
  )

  // Confirm cancel
  router.get(
    '/confirm-cancel',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ConfirmCancelControllerV2.get),
  )
  router.post(
    '/confirm-cancel',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('confirmCancel'),
    asyncMiddleware(ConfirmCancelControllerV2.post),
  )

  // Success page
  router.get(
    '/recall-updated',
    populateRecallId(),
    loadPrisoner(null, { checkSession: true, updateSession: false }),
    asyncMiddleware(RecallRecordedControllerV2.get),
  )

  return router
}
