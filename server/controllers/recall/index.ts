import express, { Router } from 'express'
import asyncMiddleware from '../../middleware/asyncMiddleware'
import { validate, populateValidationData } from '../../middleware/validationMiddleware'
import loadPrisoner from '../../middleware/loadPrisoner'
import CheckPossibleController from './checkPossibleController'
import RevocationDateController from './revocationDateController'
import NotPossibleController from './notPossibleController'
import ReturnToCustodyDateController from './returnToCustodyDateController'
import ConfirmCancelController from './confirmCancelController'
import ConflictingAdjustmentsInterruptController from './conflictingAdjustmentsInterruptController'
import NoSentencesInterruptController from './noSentencesInterruptController'
import ManualRecallInterceptController from './manualRecallInterceptController'
import CheckSentencesController from './checkSentencesController'
import SelectCourtCaseController from './selectCourtCaseController'
import UpdateSentenceTypesSummaryController from './updateSentenceTypesSummaryController'
import SelectSentenceTypeController from './selectSentenceTypeController'
import RecallTypeController from './recallTypeController'
import CheckYourAnswersController from './checkYourAnswersController'
import RecallRecordedController from './recallRecordedController'
import MultipleSentenceDecisionController from './multipleSentenceDecisionController'
import BulkSentenceTypeController from './bulkSentenceTypeController'
import underConstructionController from './underConstructionController'

export default function routes(): Router {
  const router = express.Router()

  // V2 recall flow route - /person/:nomisId/record-recall
  // Entry point - check if recall is possible (matches original '/' route in steps.ts)
  router.get('/', asyncMiddleware(CheckPossibleController.get))

  // Not possible page (no form submission)
  router.get(
    '/not-possible',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(NotPossibleController.get),
  )

  // Revocation date page with validation
  router.get(
    '/revocation-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RevocationDateController.get),
  )
  router.post(
    '/revocation-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('revocationDate'),
    asyncMiddleware(RevocationDateController.post),
  )

  // Return to custody date page with validation
  router.get(
    '/rtc-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ReturnToCustodyDateController.get),
  )
  router.post(
    '/rtc-date',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('returnToCustody'),
    asyncMiddleware(ReturnToCustodyDateController.post),
  )

  // Confirm cancel page with validation
  router.get(
    '/confirm-cancel',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ConfirmCancelController.get),
  )
  router.post(
    '/confirm-cancel',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('confirmCancel'),
    asyncMiddleware(ConfirmCancelController.post),
  )

  // Interrupt pages (GET only, no POST needed)
  router.get(
    '/conflicting-adjustments-interrupt',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(ConflictingAdjustmentsInterruptController.get),
  )

  router.get(
    '/no-sentences-interrupt',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(NoSentencesInterruptController.get),
  )

  // Manual recall intercept page (no validation needed as it's just a continue button)
  router.get(
    '/manual-recall-intercept',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ManualRecallInterceptController.get),
  )
  router.post(
    '/manual-recall-intercept',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(ManualRecallInterceptController.post),
  )

  // Select court case page (manual recall flow)
  router.get(
    '/select-court-cases',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(SelectCourtCaseController.get),
  )
  router.post(
    '/select-court-cases',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('selectCourtCase'),
    asyncMiddleware(SelectCourtCaseController.post),
  )

  // Update sentence types summary page
  router.get(
    '/update-sentence-types-summary',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(UpdateSentenceTypesSummaryController.get),
  )
  router.post(
    '/update-sentence-types-summary',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('updateSentenceTypesSummary'),
    asyncMiddleware(UpdateSentenceTypesSummaryController.post),
  )

  // Select sentence type page (individual sentence update)
  router.get(
    '/select-sentence-type/:sentenceUuid',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(SelectSentenceTypeController.get),
  )
  router.post(
    '/select-sentence-type/:sentenceUuid',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('selectSentenceType'),
    asyncMiddleware(SelectSentenceTypeController.post),
  )

  // Multiple sentence decision page
  router.get(
    '/multiple-sentence-decision/:courtCaseId',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(MultipleSentenceDecisionController.get),
  )
  router.post(
    '/multiple-sentence-decision/:courtCaseId',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('multipleSentenceDecision'),
    asyncMiddleware(MultipleSentenceDecisionController.post),
  )

  // Bulk sentence type page
  router.get(
    '/bulk-sentence-type/:courtCaseId',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(BulkSentenceTypeController.get),
  )
  router.post(
    '/bulk-sentence-type/:courtCaseId',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('bulkSentenceType'),
    asyncMiddleware(BulkSentenceTypeController.post),
  )

  // Check sentences page (no validation needed as it's just a confirmation page)
  router.get(
    '/check-sentences',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(CheckSentencesController.get),
  )
  router.post(
    '/check-sentences',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(CheckSentencesController.post),
  )

  // Recall type selection page
  router.get(
    '/recall-type',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RecallTypeController.get),
  )
  router.post(
    '/recall-type',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('recallType'),
    asyncMiddleware(RecallTypeController.post),
  )

  // Check your answers page
  router.get(
    '/check-your-answers',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(CheckYourAnswersController.get),
  )
  router.post(
    '/check-your-answers',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('checkYourAnswers'),
    asyncMiddleware(CheckYourAnswersController.post),
  )

  // Recall recorded success page (GET only, no POST)
  router.get(
    '/recall-recorded',
    loadPrisoner(null, { checkSession: true, updateSession: false }),
    asyncMiddleware(RecallRecordedController.get),
  )

  // Edit routes for main flow (allow editing before recall is saved)
  // These routes allow going back from check-your-answers to edit individual steps
  router.get(
    '/revocation-date/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RevocationDateController.get),
  )
  router.post(
    '/revocation-date/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('revocationDate'),
    asyncMiddleware(RevocationDateController.post),
  )

  router.get(
    '/rtc-date/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(ReturnToCustodyDateController.get),
  )
  router.post(
    '/rtc-date/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('returnToCustody'),
    asyncMiddleware(ReturnToCustodyDateController.post),
  )

  router.get(
    '/check-sentences/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(CheckSentencesController.get),
  )
  router.post(
    '/check-sentences/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    asyncMiddleware(CheckSentencesController.post),
  )

  router.get(
    '/recall-type/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    populateValidationData,
    asyncMiddleware(RecallTypeController.get),
  )
  router.post(
    '/recall-type/edit',
    loadPrisoner(null, { checkSession: true, updateSession: true }),
    validate('recallType'),
    asyncMiddleware(RecallTypeController.post),
  )

  // Placeholder routes for pages not yet migrated to V2
  router.get('/recall-type-interrupt', asyncMiddleware(underConstructionController))
  router.get('/no-cases-selected', asyncMiddleware(underConstructionController))

  // TODO: As more controllers are migrated to V2, replace underConstructionController with the actual V2 controller

  return router
}
